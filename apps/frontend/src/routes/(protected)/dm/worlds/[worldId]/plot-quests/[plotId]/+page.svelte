<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/plot-quests/[plotId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { ConfirmModal, FantasyDateField, PlotQuestProgressionEditor } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const plot = $derived(data.plot);
	const linkedQuestIds = $derived(new Set(plot.linkedQuests.map((l: any) => l.questId)));
	const linkedFactionIds = $derived(new Set(plot.factions.map((l: any) => l.factionId)));
	const linkedNpcIds = $derived(new Set(plot.npcs.map((l: any) => l.npcId)));

	const reload = () => async ({ update }: any) => { await update(); await invalidateAll(); };

	const STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED'];

	let _confirmOpen = $state(false);
	let _confirmMsg = $state('');
	let _confirmTitle = $state('');
	let _confirmCb = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page__header">
	<div>
		<a href="/dm/worlds/{data.world.id}/plot-quests" class="back-link">← Plot quests</a>
		<h2 class="page__title">{plot.title}</h2>
		<span class="badge badge-muted">{plot.status}</span>
	</div>
</div>

{#if form?.message}<div class="form-error">{form.message}</div>{/if}
{#if (form as any)?.updateSuccess}<div class="form-success">Saved.</div>{/if}

<div class="sections">
	<div class="card">
		<h3 class="section-title">Details</h3>
		<form method="post" action="?/update" use:enhance={reload}>
			<div class="fields">
				<div class="field">
					<label class="label" for="title">Title</label>
					<input id="title" name="title" class="input" value={plot.title} required />
				</div>
				<div class="field">
					<label class="label" for="status">Status</label>
					<select id="status" name="status" class="input input--select">
						{#each STATUSES as s}
							<option value={s} selected={plot.status === s}>{s}</option>
						{/each}
					</select>
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<FantasyDateField
						calendar={data.calendar}
						name="deadlineDay"
						label="Deadline"
						value={plot.deadlineDay}
						hint="Global fail timer for this plot — when the world day reaches this date, the Failure package can be applied."
					/>
				</div>
				<div class="field">
					<label class="label" for="sortOrder">Sort order</label>
					<input id="sortOrder" name="sortOrder" type="number" class="input" value={plot.sortOrder} />
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<label class="label" for="summary">Summary</label>
					<input id="summary" name="summary" class="input" value={plot.summary ?? ''} />
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<label class="label" for="description">Description</label>
					<textarea id="description" name="description" class="input" rows="6">{plot.description ?? ''}</textarea>
				</div>
			</div>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
				<button type="submit" class="btn btn-primary btn-sm">Save</button>
				<button
					type="button"
					class="btn btn-danger btn-sm"
					onclick={() => askConfirm(
						'Delete plot quest?',
						'This removes faction/NPC/quest links. Cannot be undone.',
						() => (document.getElementById('delete-plot-form') as HTMLFormElement)?.requestSubmit(),
					)}
				>Delete</button>
			</div>
		</form>
		<form id="delete-plot-form" method="post" action="?/delete" style="display:none;"></form>
	</div>

	<div class="plot-page__links">
		<div class="card">
			<h3 class="section-title">Linked system Quests</h3>
			{#if (form as any)?.linkSuccess}<div class="form-success">Quest links updated.</div>{/if}
			{#each plot.linkedQuests as link (link.id)}
				<div class="faction-subrow">
					<span class="faction-subrow__grow" style="font-weight:600;">
						{#if link.quest}
							<a href="/dm/quests/{link.quest.id}">{link.quest.title}</a>
						{:else}
							(missing quest)
						{/if}
					</span>
					{#if link.quest}<span class="badge badge-muted">{link.quest.status}</span>{/if}
					<form method="post" action="?/unlinkQuest" use:enhance={reload}>
						<input type="hidden" name="linkId" value={link.id} />
						<button type="submit" class="btn btn-danger btn-sm">✕</button>
					</form>
				</div>
			{:else}
				<p class="table__empty">No system Quests linked yet.</p>
			{/each}
			{#if data.linkableQuests.length}
				<form method="post" action="?/linkQuest" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="questId" class="input faction-subrow__grow" required>
						<option value="">— Pick quest —</option>
						{#each data.linkableQuests as q}
							{#if !linkedQuestIds.has(q.id)}
								<option value={q.id}>{q.title} ({q.status})</option>
							{/if}
						{/each}
					</select>
					<button type="submit" class="btn btn-primary btn-sm">+ Link quest</button>
				</form>
			{/if}
		</div>

		<div class="card">
			<h3 class="section-title">Linked factions</h3>
			{#if (form as any)?.factionSuccess}<div class="form-success">Faction links updated.</div>{/if}
			{#each plot.factions as link (link.id)}
				<div class="faction-subrow">
					<span class="faction-subrow__grow" style="font-weight:600;">
						{#if link.faction}
							<a href="/dm/worlds/{data.world.id}/factions/{link.faction.id}">{link.faction.name}</a>
						{:else}
							(missing faction)
						{/if}
					</span>
					<form method="post" action="?/unlinkFaction" use:enhance={reload}>
						<input type="hidden" name="linkId" value={link.id} />
						<button type="submit" class="btn btn-danger btn-sm">✕</button>
					</form>
				</div>
			{:else}
				<p class="table__empty">No factions linked.</p>
			{/each}
			{#if data.worldFactions.length}
				<form method="post" action="?/linkFaction" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="factionId" class="input faction-subrow__grow" required>
						<option value="">— Pick faction —</option>
						{#each data.worldFactions as f}
							{#if !linkedFactionIds.has(f.id)}
								<option value={f.id}>{f.name}</option>
							{/if}
						{/each}
					</select>
					<button type="submit" class="btn btn-primary btn-sm">+ Link faction</button>
				</form>
			{/if}
		</div>

		<div class="card">
			<h3 class="section-title">Linked NPCs</h3>
			{#if (form as any)?.npcSuccess}<div class="form-success">NPC links updated.</div>{/if}
			{#each plot.npcs as link (link.id)}
				<div class="faction-subrow">
					<span class="faction-subrow__grow" style="font-weight:600;">
						{#if link.npc}
							<a href="/dm/worlds/{data.world.id}/npcs/{link.npc.id}">{link.npc.name}</a>
						{:else}
							(missing NPC)
						{/if}
					</span>
					<form method="post" action="?/unlinkNpc" use:enhance={reload}>
						<input type="hidden" name="linkId" value={link.id} />
						<button type="submit" class="btn btn-danger btn-sm">✕</button>
					</form>
				</div>
			{:else}
				<p class="table__empty">No NPCs linked.</p>
			{/each}
			{#if data.worldNpcs.length}
				<form method="post" action="?/linkNpc" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="npcId" class="input faction-subrow__grow" required>
						<option value="">— Pick NPC —</option>
						{#each data.worldNpcs as n}
							{#if !linkedNpcIds.has(n.id)}
								<option value={n.id}>{n.name}</option>
							{/if}
						{/each}
					</select>
					<button type="submit" class="btn btn-primary btn-sm">+ Link NPC</button>
				</form>
			{/if}
		</div>
	</div>

	<div class="plot-page__structure">
		<PlotQuestProgressionEditor
			progression={data.progression}
			calendar={data.calendar}
			canEdit={data.canManage}
			onSaved={async () => { await invalidateAll(); }}
		/>
	</div>
</div>

<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Delete"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>

<style>
	.plot-page__links {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	.plot-page__structure {
		grid-column: 1 / -1;
		min-width: 0;
	}
</style>
