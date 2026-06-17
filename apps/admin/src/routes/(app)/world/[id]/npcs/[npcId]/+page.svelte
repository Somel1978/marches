<!-- apps/admin/src/routes/(app)/world/[id]/npcs/[npcId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world = $derived((data as any).world);
	const npc   = $derived((data as any).npc);

	const linkedQuestIds = $derived(new Set(npc.quests.map((q: any) => q.questId)));

	function reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.id}/npcs" class="back-link">← NPCs</a>
			<h2 class="page__title">👤 {npc.name}</h2>
			<span class="badge badge-npc--{npc.status}">{npc.status}</span>
			{#if !npc.isVisible}<span class="badge badge-muted">🔒 Hidden from players</span>{/if}
		</div>
		<form id="cf-140d1b" method="post" action="?/delete" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
			<button type="button" class="btn btn-danger btn-sm" onclick={() => window.confirmModal('Confirm', `Delete NPC "${npc.name}"?`).then(ok => { if(ok)(document.getElementById("cf-140d1b") as HTMLFormElement).requestSubmit(); })}>Delete NPC</button>
		</form>
	</div>

	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
	{#if (form as any)?.updateSuccess}<div class="form-success">NPC updated.</div>{/if}

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/update" use:enhance={reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="nname">Name</label>
						<input id="nname" name="name" type="text" class="input" value={npc.name} required />
					</div>
					<div class="field">
						<label class="label" for="naliases">Aliases / titles</label>
						<input id="naliases" name="aliases" type="text" class="input" value={npc.aliases ?? ''} placeholder={"e.g. Silas 'The Crow' Vane"} />
					</div>
					<div class="field">
						<label class="label" for="nimage">Image URL</label>
						<input id="nimage" name="imageUrl" type="text" class="input" value={npc.imageUrl ?? ''} />
					</div>
					<div class="field">
						<label class="label" for="nstatus">Status</label>
						<select id="nstatus" name="status" class="input">
							{#each ['ALIVE', 'DEAD', 'MISSING', 'IMPRISONED', 'EXILED'] as s}
								<option value={s} selected={npc.status === s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="nvisible">Visible to players (public NPC directory)</label>
						<select id="nvisible" name="isVisible" class="input">
							<option value="true"  selected={npc.isVisible}>Yes</option>
							<option value="false" selected={!npc.isVisible}>No — hidden</option>
						</select>
					</div>
					<div class="field">
						<label class="label" for="nlocation">Location</label>
						<select id="nlocation" name="locationId" class="input">
							<option value="">— No fixed location —</option>
							{#each world.regions as region}
								{#each region.locations as loc}
									<option value={loc.id} selected={npc.locationId === loc.id}>{region.name} › {loc.name}</option>
								{/each}
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="nfaction">Faction</label>
						<select id="nfaction" name="factionId" class="input">
							<option value="">— No faction —</option>
							{#each (data as any).factions as f}
								<option value={f.id} selected={npc.factionId === f.id}>{f.name}</option>
							{/each}
						</select>
						<p style="font-size:0.78rem; opacity:0.65; margin-top:0.25rem;">Changing faction? Save first, then pick the rank.</p>
					</div>
					<div class="field">
						<label class="label" for="nrank">Current rank</label>
						<select id="nrank" name="rankId" class="input" disabled={!npc.factionId}>
							<option value="">— No rank —</option>
							{#each (data as any).factionRanks as r}
								<option value={r.id} selected={npc.rankId === r.id}>{r.name} (level {r.level})</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="nrole">Faction role</label>
						<input id="nrole" name="factionRole" type="text" class="input" value={npc.factionRole ?? ''} placeholder="Quartermaster, Fixer, Assassin, Guildmaster…" />
					</div>
					<div class="field">
						<label class="label" for="nrenown">Renown threshold <span style="font-weight:400; opacity:0.7;">(min character renown for a meeting, −10..10, empty = none)</span></label>
						<input id="nrenown" name="renownThreshold" type="number" class="input" min="-10" max="10" value={npc.renownThreshold ?? ''} />
					</div>
					<div class="field">
						<label class="label" for="nstat">Stat block (markdown — link to an image or write manually)</label>
						<textarea id="nstat" name="statBlock" class="input" rows="5">{npc.statBlock ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nmanner">Mannerisms & voice</label>
						<textarea id="nmanner" name="mannerisms" class="input" rows="2" placeholder="Speaks in a slow whisper, never breaks eye contact…">{npc.mannerisms ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nideals">Ideals</label>
						<textarea id="nideals" name="ideals" class="input" rows="2">{npc.ideals ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nbonds">Bonds</label>
						<textarea id="nbonds" name="bonds" class="input" rows="2">{npc.bonds ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nflaws">Flaws</label>
						<textarea id="nflaws" name="flaws" class="input" rows="2">{npc.flaws ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nmotivation">Primary motivation</label>
						<textarea id="nmotivation" name="motivation" class="input" rows="2" placeholder="What does this person want right now?">{npc.motivation ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nservices">Services provided</label>
						<textarea id="nservices" name="services" class="input" rows="2">{npc.services ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nbounties">Bounties / quest notes (markdown, free text)</label>
						<textarea id="nbounties" name="bounties" class="input" rows="3">{npc.bounties ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="nsecrets">Segredos / secrets (DM/admin only)</label>
						<textarea id="nsecrets" name="secrets" class="input" rows="3">{npc.secrets ?? ''}</textarea>
					</div>
				</div>
				<button type="submit" class="btn btn-primary" style="margin-top:0.75rem;">Save</button>
			</form>
		</div>

		<div class="card">
			<h3 class="section-title">Associated quests & bounties</h3>
			{#if (form as any)?.questSuccess}<div class="form-success">Quest links updated.</div>{/if}
			{#each npc.quests as link (link.id)}
				<div class="faction-subrow">
					<span class="faction-subrow__grow" style="font-weight:600;">
						{#if link.quest}
							<a href="/quests/{link.quest.id}">{link.quest.title}</a>
						{:else}
							(deleted quest)
						{/if}
					</span>
					{#if link.quest}<span class="badge badge-muted">{link.quest.status}</span>{/if}
					<form method="post" action="?/removeQuest" use:enhance={reload}>
						<input type="hidden" name="linkId" value={link.id} />
						<button type="submit" class="btn btn-danger btn-sm">✕</button>
					</form>
				</div>
			{:else}
				<p class="table__empty">No quests linked yet.</p>
			{/each}
			{#if (data as any).worldQuests.length}
				<form method="post" action="?/addQuest" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="questId" class="input faction-subrow__grow" required>
						<option value="">— Pick quest —</option>
						{#each (data as any).worldQuests as q}
							{#if !linkedQuestIds.has(q.id)}
								<option value={q.id}>{q.title} ({q.status})</option>
							{/if}
						{/each}
					</select>
					<button type="submit" class="btn btn-primary btn-sm">+ Link quest</button>
				</form>
			{/if}
		</div>
	</div>
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>