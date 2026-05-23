<!-- apps/admin/src/routes/(app)/quests/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const STATUSES = ['PENDING_APPROVAL', 'PUBLISHED', 'IN_PROGRESS', 'PENDING_RESULT', 'COMPLETED', 'CANCELLED', 'DRAFT'];

	const statusColors: Record<string, string> = {
		DRAFT:            'badge-muted',
		PENDING_APPROVAL: 'badge-warning',
		PUBLISHED:        'badge-success',
		IN_PROGRESS:      'badge-accent',
		PENDING_RESULT:            'badge-warning',
		PENDING_RESULT_APPROVAL:   'badge-accent',
		COMPLETED:        'badge-success',
		CANCELLED:        'badge-danger',
	};

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Quests</h2>
			<p class="page__subtitle">{data.total} quest{data.total !== 1 ? 's' : ''}</p>
		</div>
	</div>

	<div class="toolbar">
		<a href="/quests" class="btn btn-ghost btn-sm">All</a>
		{#each STATUSES as s}
			<a href="/quests?status={s}" class="btn btn-ghost btn-sm">{s.replace('_', ' ')}</a>
		{/each}
	</div>

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>Quest</th>
					<th class="col-hide-mobile">DM</th>
					<th>Status</th>
					<th class="col-hide-tablet">Players</th>
					<th class="col-hide-tablet">Created</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as quest}
					<tr>
						<td>
							<strong>{quest.title}</strong>
							{#if (quest as any).regionName}
								<span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:0.125rem;">
									📍 {(quest as any).worldName ? `${(quest as any).worldName} › ` : ''}{(quest as any).regionName}{(quest as any).locationName ? ` · ${(quest as any).locationName}` : ''}
								</span>
							{/if}
							{#if quest.rewardAdjusted}
								<span class="badge badge-warning" style="margin-left:0.375rem;">Rewards changed</span>
							{/if}
						</td>
						<td class="table__muted col-hide-mobile">{(quest as any).dmName ?? quest.dmProfileId}</td>
						<td><span class="badge {statusColors[quest.status] ?? 'badge-muted'}">{quest.status.replace('_', ' ')}</span></td>
						<td class="table__muted col-hide-tablet">{quest.signups.length} / {quest.maxCapacity}</td>
						<td class="table__muted col-hide-tablet">{formatDate(quest.createdAt)}</td>
						<td class="table__action"><a href="/quests/{quest.id}" class="btn btn-ghost btn-sm">View</a></td>
					</tr>
				{:else}
					<tr><td colspan="6" class="table__empty">No quests found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.totalPages > 1}
		<div class="pagination">
			{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as p}
				<a href="/quests?page={p}" class="pagination__page" class:pagination__page--active={p === data.page}>{p}</a>
			{/each}
		</div>
	{/if}
</div>