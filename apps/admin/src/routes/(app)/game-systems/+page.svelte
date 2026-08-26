<!-- apps/admin/src/routes/(app)/game-systems/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const systems = $derived((data as any).systems ?? []);
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Game Systems</h2>
		<a href="/game-systems/new" class="btn btn-primary btn-sm">+ New</a>
	</div>

	<div class="card">
		{#if systems.length}
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Slug</th>
							<th>Status</th>
							<th>Manage data</th>
							<th>Progression</th>
						</tr>
					</thead>
					<tbody>
						{#each systems as s}
							<tr>
								<td style="font-weight:600;">{s.name}</td>
								<td class="table__muted">{s.slug}</td>
								<td>
									<form method="post" action="?/toggleActive"
										use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="id"       value={s.id} />
										<input type="hidden" name="isActive" value={String(!s.isActive)} />
										<button type="submit" class="btn btn-sm {s.isActive ? 'btn-primary' : 'btn-ghost'}">
											{s.isActive ? '✓ Active' : 'Inactive'}
										</button>
									</form>
								</td>
								<td>
									{#if s.slug === 'dnd5e'}
										<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
											<a href="/game-systems/{s.id}/dnd5e/classes"          class="btn btn-ghost btn-sm">Classes</a>
											<a href="/game-systems/{s.id}/dnd5e/species"          class="btn btn-ghost btn-sm">Species</a>
											<a href="/game-systems/{s.id}/dnd5e/backgrounds"      class="btn btn-ghost btn-sm">Backgrounds</a>
											<a href="/game-systems/{s.id}/dnd5e/feats"          class="btn btn-ghost btn-sm">Feats</a>
											<a href="/game-systems/{s.id}/dnd5e/spells"         class="btn btn-ghost btn-sm">Spells</a>
											<a href="/game-systems/{s.id}/data/import/dnd5e"      class="btn btn-ghost btn-sm">↑ Import</a>
										</div>
									{:else}
										<span class="table__muted" style="font-size:0.8125rem; font-style:italic;">Schema not yet built</span>
									{/if}
								</td>
								<td>
									<a href="/game-systems/{s.id}/progression" class="btn btn-ghost btn-sm">Progression</a>
									{#if !(s as any).hasProgression}
										<span class="badge badge-warning-dim" style="font-size:0.6875rem;margin-left:0.375rem;" title="No progression thresholds configured — characters cannot gain XP or levels until this is set up.">⚠ Not configured</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="table__empty">No game systems found.</p>
		{/if}
	</div>
</div>