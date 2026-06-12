<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/factions/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world     = $derived((data as any).world);
	const canManage = $derived((data as any).canManage === true);

	const tierLabel: Record<string, string> = { LOCAL: 'Local', REGIONAL: 'Regional', WORLD: 'World' };
</script>

<div>
	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
	{#if (form as any)?.deleteSuccess}<div class="form-success">Faction deleted.</div>{/if}

	<div class="sections">
		{#if canManage}
			<div class="card">
				<h3 class="section-title">New faction</h3>
				<form method="post" action="?/create" use:enhance style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
					<div class="field" style="flex:1; min-width:200px;">
						<label class="label" for="fname">Name</label>
						<input id="fname" name="name" type="text" class="input" required />
					</div>
					<button type="submit" class="btn btn-primary">Create</button>
				</form>
			</div>
		{/if}

		<div class="card">
			<h3 class="section-title">🛡 Factions</h3>
			{#if (data as any).factions?.length}
				<div class="table-wrap">
					<table class="table">
						<thead><tr><th>Heraldry</th><th>Name</th><th>Tier</th><th>NPCs</th><th>Ranks</th><th>Renown rows</th><th>Visible</th><th></th></tr></thead>
						<tbody>
							{#each (data as any).factions as f}
								<tr>
									<td>
										{#if f.heraldryUrl}
											<img src={f.heraldryUrl} alt={f.name} class="faction-card__heraldry" style="width:36px; height:36px;" />
										{:else}
											<span style="font-size:1.25rem;">🛡</span>
										{/if}
									</td>
									<td style="font-weight:600;">
										{f.name}
										{#if f.motto}<div style="font-size:0.8rem; font-style:italic; opacity:0.7;">{f.motto}</div>{/if}
									</td>
									<td><span class="badge badge-tier--{f.powerTier}">{tierLabel[f.powerTier] ?? f.powerTier}</span></td>
									<td>{f._count?.npcs ?? 0}</td>
									<td>{f._count?.ranks ?? 0}</td>
									<td>{f._count?.renown ?? 0}</td>
									<td>{f.isVisible ? '✓' : '🔒'}</td>
									<td style="white-space:nowrap;">
										<a href="/dm/worlds/{world.id}/factions/{f.id}" class="btn btn-ghost btn-sm">{canManage ? 'Manage' : 'View'}</a>
										{#if canManage}
											<form method="post" action="?/delete" style="display:inline;" use:enhance={({ cancel }) => {
												if (!confirm(`Delete faction "${f.name}"? This removes its ranks, territories, relations and renown.`)) { cancel(); return; }
												return async ({ update }) => { await update(); };
											}}>
												<input type="hidden" name="factionId" value={f.id} />
												<button type="submit" class="btn btn-danger btn-sm">Delete</button>
											</form>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="table__empty">No factions in this world yet.</p>
			{/if}
		</div>
	</div>
</div>
