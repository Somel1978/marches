<!-- apps/admin/src/routes/(app)/game-systems/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Game Systems</h2>
			<p class="page__subtitle">{data.gameSystems.length} system{data.gameSystems.length !== 1 ? 's' : ''}</p>
		</div>
		<a href="/game-systems/new" class="btn btn-primary">Add system</a>
	</div>

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th class="col-hide-mobile">Description</th>
					<th>Available</th>
					<th class="col-hide-tablet">Created</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.gameSystems as gs}
					<tr>
						<td><strong>{gs.name}</strong></td>
						<td class="table__muted col-hide-mobile">{gs.description ?? '—'}</td>
						<td>
							<span class="badge {gs.isAvailable ? 'badge-success' : 'badge-muted'}">
								{gs.isAvailable ? 'Yes' : 'No'}
							</span>
						</td>
						<td class="table__muted col-hide-tablet">{formatDate(gs.createdAt)}</td>
						<td class="table__action">
							<a href="/game-systems/{gs.id}" class="btn btn-ghost btn-sm">Edit</a>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="table__empty">No game systems yet. <a href="/game-systems/new">Add one</a>.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
