<!-- apps/admin/src/routes/(app)/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const s = $derived((data as any).platformStats);
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Dashboard</h2>
	</div>

	{#if s}
		<!-- Totals -->
		<div class="dashboard__stats" style="margin-bottom:1.5rem;">
			<div class="stat-card"><span class="stat-value">{s.totalUsers}</span><span class="stat-label">Users</span></div>
			<div class="stat-card"><span class="stat-value">{s.totalCharacters}</span><span class="stat-label">Characters</span></div>
			<div class="stat-card"><span class="stat-value">{s.totalWorlds}</span><span class="stat-label">Worlds</span></div>
			<div class="stat-card"><span class="stat-value">{s.questsByStatus?.COMPLETED ?? 0}</span><span class="stat-label">Quests completed</span></div>
			<div class="stat-card"><span class="stat-value">{s.questsByStatus?.PUBLISHED ?? 0}</span><span class="stat-label">Quests active</span></div>
			<div class="stat-card"><span class="stat-value">{s.questsByStatus?.PENDING_APPROVAL ?? 0}</span><span class="stat-label">Pending approval</span></div>
		</div>

		<div class="sections">
			<!-- Quests completed per month -->
			<div class="card">
				<h3 class="section-title">Quests completed — last 6 months</h3>
				{#if s.completedPerMonth?.length}
					<div class="table-wrap">
						<table class="table">
						<thead><tr><th>Month</th><th>Completed</th></tr></thead>
						<tbody>
							{#each s.completedPerMonth as row}
								<tr><td>{row.month}</td><td>{row.count}</td></tr>
							{/each}
						</tbody>
					</table>
</div>
				{:else}
					<p class="table__empty">No completed quests yet.</p>
				{/if}
			</div>

			<!-- Marketplace -->
			<div class="card">
				<h3 class="section-title">Marketplace</h3>
				<div class="dashboard__stats">
					<div class="stat-card"><span class="stat-value">{s.purchases.count}</span><span class="stat-label">Total purchases</span></div>
					<div class="stat-card"><span class="stat-value">{Math.round(s.purchases.total).toLocaleString()} GP</span><span class="stat-label">Total purchased</span></div>
					<div class="stat-card"><span class="stat-value">{Math.round(s.purchases.average).toLocaleString()} GP</span><span class="stat-label">Avg purchase</span></div>
					<div class="stat-card"><span class="stat-value">{s.sales.count}</span><span class="stat-label">Total sales</span></div>
					<div class="stat-card"><span class="stat-value">{Math.round(s.sales.total).toLocaleString()} GP</span><span class="stat-label">Total sold</span></div>
					<div class="stat-card"><span class="stat-value">{Math.round(s.sales.average).toLocaleString()} GP</span><span class="stat-label">Avg sale</span></div>
				</div>
			</div>
		</div>
	{/if}
</div>