<!-- apps/admin/src/routes/(app)/+page.svelte -->
<script lang="ts">
	import { AreaChart, LineChart, BarChart, DonutChart } from '@core/ui';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const s = $derived((data as any).platformStats);

	const RARITY_LABEL: Record<string, string> = {
		Mundane: 'Mundane', Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare',
		Very_Rare: 'Very Rare', Legendary: 'Legendary', Artifact: 'Artifact',
	};

	// Two separate series, not two lines on one chart — average price (gold
	// pieces) and item count are on completely different scales, so plotting
	// them together would flatten whichever series has the smaller range.
	const priceByRaritySeries = $derived(
		s?.itemsByRarity?.length
			? [{ name: 'Avg buy price', points: s.itemsByRarity.map((r: any) => ({ label: RARITY_LABEL[r.rarity] ?? r.rarity, value: r.avgPrice })) }]
			: []
	);
	const countByRaritySeries = $derived(
		s?.itemsByRarity?.length
			? [{ name: 'Items available', points: s.itemsByRarity.map((r: any) => ({ label: RARITY_LABEL[r.rarity] ?? r.rarity, value: r.count })) }]
			: []
	);

	// Quests completed per month, same real data as the table above it,
	// rendered as a LineChart — tests the smoothing/axis logic against
	// date-like labels instead of rarity-tier labels.
	const questsPerMonthSeries = $derived(
		s?.completedPerMonth?.length
			? [{ name: 'Quests completed', points: s.completedPerMonth.map((r: any) => ({ label: r.month, value: r.count })) }]
			: []
	);

	// Buy vs sell transaction counts, a genuine parts-of-a-whole split —
	// real data from the same aggregates already used in the Marketplace
	// stat cards below, just re-shaped for the donut.
	const transactionSplit = $derived(
		s ? [
			{ label: 'Purchases', value: s.purchases.count },
			{ label: 'Sales', value: s.sales.count },
		].filter(x => x.value > 0) : []
	);
	const transactionTotal = $derived(s ? s.purchases.count + s.sales.count : 0);
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
				{#if questsPerMonthSeries.length}
					<LineChart series={questsPerMonthSeries} showLegend={false} />
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

			<!-- Marketplace items — price by rarity (AreaChart) -->
			<div class="card">
				<h3 class="section-title">Avg. buy price by rarity</h3>
				{#if priceByRaritySeries.length}
					<AreaChart series={priceByRaritySeries} yFormat={(v) => `${Math.round(v)} GP`} />
				{:else}
					<p class="table__empty">No marketplace items yet.</p>
				{/if}
			</div>

			<!-- Marketplace items — count by rarity (BarChart) -->
			<div class="card">
				<h3 class="section-title">Items available by rarity</h3>
				{#if countByRaritySeries.length}
					<BarChart series={countByRaritySeries} yFormat={(v) => String(Math.round(v))} showLegend={false} />
				{:else}
					<p class="table__empty">No marketplace items yet.</p>
				{/if}
			</div>

			<!-- Buy vs sell split (DonutChart) -->
			<div class="card">
				<h3 class="section-title">Purchases vs sales</h3>
				{#if transactionSplit.length}
					<DonutChart
						slices={transactionSplit}
						centerValue={String(transactionTotal)}
						centerLabel="Transactions"
					/>
				{:else}
					<p class="table__empty">No transactions yet.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>