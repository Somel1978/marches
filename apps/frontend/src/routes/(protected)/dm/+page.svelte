<!-- apps/frontend/src/routes/(protected)/dm/+page.svelte -->
<script lang="ts">
	import DmAvailabilityDashboard from '$lib/dm/DmAvailabilityDashboard.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const availability = $derived((data as any).availability);

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
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">DM Dashboard</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			{#if ((data as any).myWorlds ?? []).length}
				<a href="/dm/worlds" class="btn btn-ghost btn-sm">🌍 My Worlds</a>
			{/if}
			<a href="/dm/quests/new" class="btn btn-primary btn-sm">+ New quest</a>
			<a href="/dm/profile" class="btn btn-ghost btn-sm">{(data as any).dmProfile ? 'Edit profile' : 'Create profile'}</a>
		</div>
	</div>

	<!-- Player availability -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Player availability</h3>
		<DmAvailabilityDashboard
			weekStart={availability.weekStart}
			heatmapData={availability.heatmapData}
			dayPlayerCounts={availability.dayPlayerCounts}
			playerRows={availability.playerRows}
			totalPlayers={availability.totalPlayers}
			worldMap={availability.worldMap}
			basePath="/dm"
			title="Player availability"
			sectionHint="All players across every world. Click a block to see characters."
			embedded={true}
		/>
	</div>

	{#if data.quests.length === 0}
		<div class="card" style="text-align:center; padding:2rem;">
			<p style="color:var(--text-muted);">No quests yet. Create your first quest!</p>
		</div>
	{:else}
		<div class="table-wrap card">
			<div class="table-wrap">
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
		</div>
	{/if}

	<!-- Assigned worlds -->
	{#if ((data as any).myWorlds ?? []).length}
		<div class="card" style="margin-top:1.5rem;">
			<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap">
				<h3 class="section-title" style="margin:0;">My Worlds</h3>
				<a href="/dm/worlds" class="btn btn-ghost btn-sm">View all</a>
			</div>
			<div style="display:flex; flex-direction:column; gap:0.375rem;">
				{#each (data as any).myWorlds as world}
					<a href="/dm/worlds/{world.id}"
						style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem; border-radius:var(--radius-sm); background:var(--bg-elevated); text-decoration:none; flex-wrap:wrap">
						<span style="font-weight:600; color:var(--text-primary);">{world.name}</span>
						{#if !world.isActive}<span class="badge badge-muted">Inactive</span>{/if}
						{#if world.canManage}
							<span class="badge badge-accent" style="margin-left:auto;">Manage</span>
						{:else}
							<span class="badge badge-muted" style="margin-left:auto;">Quests only</span>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>