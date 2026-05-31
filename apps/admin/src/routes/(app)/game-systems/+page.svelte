<!-- apps/admin/src/routes/(app)/game-systems/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const systems = $derived((data as any).systems ?? []);

	// Systems with dnd5e schema support
	const DND5E_SLUG = 'dnd5e';
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
						<th>Active</th>
						<th>Data</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each systems as s}
						<tr>
							<td style="font-weight:600;">{s.name}</td>
							<td class="table__muted">{s.slug}</td>
							<td>
								<form method="post" action="?/toggleActive" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="margin:0;">
									<input type="hidden" name="id"       value={s.id} />
									<input type="hidden" name="isActive" value={String(!s.isActive)} />
									<button type="submit"
										class="badge {s.isActive ? 'badge-success' : 'badge-muted'}"
										style="cursor:pointer; border:none; background:none;">
										{s.isActive ? 'Active' : 'Inactive'}
									</button>
								</form>
							</td>
							<td>
								{#if s.slug === DND5E_SLUG}
									<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
										<a href="/game-systems/{s.id}/classes"     class="btn btn-ghost btn-sm">Classes</a>
										<a href="/game-systems/{s.id}/species"     class="btn btn-ghost btn-sm">Species</a>
										<a href="/game-systems/{s.id}/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
										<a href="/game-systems/{s.id}/import"      class="btn btn-ghost btn-sm">Import</a>
									</div>
								{:else}
									<span class="table__muted" style="font-size:0.8125rem;">Schema not yet implemented</span>
								{/if}
							</td>
							<td>
								<a href="/game-systems/{s.id}/progression" class="btn btn-ghost btn-sm">Progression</a>
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