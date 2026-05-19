<!-- apps/frontend/src/routes/(protected)/dm/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		DRAFT:            'badge-muted',
		PENDING_APPROVAL: 'badge-warning',
		PUBLISHED:        'badge-success',
		IN_PROGRESS:      'badge-accent',
		PENDING_RESULT:   'badge-warning',
		COMPLETED:        'badge-success',
		CANCELLED:        'badge-danger',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">DM Dashboard</h2>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<a href="/dm/quests/new" class="btn btn-primary btn-sm">+ New quest</a>
			<a href="/dm/profile" class="btn btn-ghost btn-sm">{data.profile ? 'Edit profile' : 'Create profile'}</a>
		</div>
	</div>

	{#if data.quests.length === 0}
		<div class="card" style="text-align:center; padding:2rem;">
			<p style="color:var(--text-muted);">No quests yet. Create your first quest!</p>
		</div>
	{:else}
		<div class="table-wrap card">
			<table class="table">
				<thead>
					<tr>
						<th>Quest</th>
						<th>Status</th>
						<th class="col-hide-mobile">Players</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.quests as quest}
						<tr>
							<td><strong>{quest.title}</strong></td>
							<td><span class="badge {statusColors[quest.status] ?? 'badge-muted'}">{quest.status.replace('_', ' ')}</span></td>
							<td class="table__muted col-hide-mobile">{quest.signups.length}/{quest.maxCapacity}</td>
							<td class="table__action"><a href="/dm/quests/{quest.id}" class="btn btn-ghost btn-sm">Manage</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>