<!-- apps/admin/src/routes/(app)/world/[id]/npcs/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world = $derived((data as any).world);

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
			<a href="/world/{world.id}" class="back-link">← {world.name}</a>
			<h2 class="page__title">👤 NPCs</h2>
		</div>
	</div>

	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
	{#if (form as any)?.deleteSuccess}<div class="form-success">NPC deleted.</div>{/if}

	<div class="sections">
		<div class="card">
			<h3 class="section-title">New NPC</h3>
			<form method="post" action="?/create" use:enhance style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
				<div class="field" style="flex:1; min-width:200px;">
					<label class="label" for="nname">Name</label>
					<input id="nname" name="name" type="text" class="input" required />
				</div>
				<button type="submit" class="btn btn-primary">Create</button>
			</form>
		</div>

		<div class="card">
			<form method="get" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
				<input name="q" type="text" class="input" style="flex:1; min-width:180px;" placeholder="Search name or alias…" value={(data as any).q} />
				<select name="factionId" class="input" style="min-width:180px;">
					<option value="">All factions</option>
					{#each (data as any).factions as f}
						<option value={f.id} selected={(data as any).factionId === f.id}>{f.name}</option>
					{/each}
				</select>
				<button type="submit" class="btn btn-ghost">Filter</button>
			</form>

			{#if (data as any).npcs?.length}
				<div class="table-wrap">
					<table class="table">
						<thead><tr><th>Name</th><th>Faction</th><th>Rank / role</th><th>Location</th><th>Status</th><th>Visible</th><th></th></tr></thead>
						<tbody>
							{#each (data as any).npcs as npc}
								<tr>
									<td style="font-weight:600;">
										{npc.name}
										{#if npc.aliases}<div style="font-size:0.8rem; font-style:italic; opacity:0.7;">{npc.aliases}</div>{/if}
									</td>
									<td>{npc.faction?.name ?? '—'}</td>
									<td>{[npc.rank?.name, npc.factionRole].filter(Boolean).join(' · ') || '—'}</td>
									<td>{npc.location ? `${npc.location.region?.name} › ${npc.location.name}` : '—'}</td>
									<td><span class="badge badge-npc--{npc.status}">{npc.status}</span></td>
									<td>{npc.isVisible ? '✓' : '🔒'}</td>
									<td style="white-space:nowrap;">
										<a href="/world/{world.id}/npcs/{npc.id}" class="btn btn-ghost btn-sm">Manage</a>
										<form id="cf-71f3c5" method="post" action="?/delete" style="display:inline;" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
											<input type="hidden" name="npcId" value={npc.id} />
											<button type="button" class="btn btn-danger btn-sm" onclick={() => window.confirmModal('Confirm', `Delete NPC "${npc.name}"?`).then(ok => { if(ok)(document.getElementById("cf-71f3c5") as HTMLFormElement).requestSubmit(); })}>Delete</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="table__empty">No NPCs found.</p>
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