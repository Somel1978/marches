<!-- apps/frontend/src/routes/(protected)/stats/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const pub  = $derived((data as any).publicStats);
	const user = $derived((data as any).userStats);

	function gp(n: number) { return Math.round(n).toLocaleString() + ' GP'; }
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Statistics</h2>
	</div>

	{#if pub}
		<!-- Platform -->
		<div class="card" style="margin-bottom:1.5rem;">
			<h3 class="section-title">Platform</h3>
			<div class="dashboard__stats">
				<div class="stat-card"><span class="stat-value">{pub.questsThisWeek}</span><span class="stat-label">Quests this week</span></div>
				<div class="stat-card"><span class="stat-value">{pub.questsThisMonth}</span><span class="stat-label">Quests this month</span></div>
				<div class="stat-card"><span class="stat-value">{pub.avgQuestsPerDm?.toFixed(1) ?? '—'}</span><span class="stat-label">Avg quests / DM</span></div>
				<div class="stat-card"><span class="stat-value">{pub.avgDmRating?.toFixed(2) ?? '—'}</span><span class="stat-label">Avg DM rating</span></div>
			</div>
		</div>

		<div class="sections">
			<!-- Characters by progression -->
			<div class="card">
				<h3 class="section-title">Characters by progression</h3>
				{#if pub.charsByLevel?.length}
					<table class="table">
						<thead><tr><th>Tier</th><th>Characters</th></tr></thead>
						<tbody>
							{#each pub.charsByLevel as row}
								<tr><td>{row.label}</td><td>{row.count}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="table__empty">No progression data yet.</p>
				{/if}
			</div>

			<!-- Avg party level per quest -->
			<div class="card">
				<h3 class="section-title">Average party level per quest</h3>
				{#if pub.questStats?.length}
					<table class="table">
						<thead><tr><th>#</th><th>Players</th><th>Avg level</th><th>Date</th></tr></thead>
						<tbody>
							{#each pub.questStats as qs, i}
								<tr>
									<td>{i + 1}</td>
									<td>{qs.playerCount}</td>
									<td>{qs.avgPartyLevel.toFixed(1)}</td>
									<td class="table__muted">{new Date(qs.completedAt).toLocaleDateString('en-GB')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="table__empty">No quest data yet.</p>
				{/if}
			</div>

			<!-- Top 10 purchased -->
			<div class="card">
				<h3 class="section-title">Top 10 most purchased items</h3>
				{#if pub.topBought?.length}
					<table class="table">
						<thead><tr><th>Item</th><th>Units sold</th></tr></thead>
						<tbody>
							{#each pub.topBought as item}
								<tr><td>{item.name}</td><td>{item.qty}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="table__empty">No purchases yet.</p>
				{/if}
			</div>

			<!-- Top 10 sold -->
			<div class="card">
				<h3 class="section-title">Top 10 most sold items</h3>
				{#if pub.topSold?.length}
					<table class="table">
						<thead><tr><th>Item</th><th>Units sold</th></tr></thead>
						<tbody>
							{#each pub.topSold as item}
								<tr><td>{item.name}</td><td>{item.qty}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="table__empty">No sales yet.</p>
				{/if}
			</div>

			<!-- Marketplace trends -->
			<div class="card">
				<h3 class="section-title">Marketplace — last 6 months</h3>
				{#if pub.purchasesPerMonth?.length || pub.salesPerMonth?.length}
					{@const months = [...new Set([...pub.purchasesPerMonth.map((r: any) => r.month), ...pub.salesPerMonth.map((r: any) => r.month)])].sort()}
					<table class="table">
						<thead><tr><th>Month</th><th>Purchases</th><th>Sales</th></tr></thead>
						<tbody>
							{#each months as month}
								{@const p = pub.purchasesPerMonth.find((r: any) => r.month === month)}
								{@const s = pub.salesPerMonth.find((r: any) => r.month === month)}
								<tr>
									<td>{month}</td>
									<td>{p ? gp(p.total) : '—'}</td>
									<td>{s ? gp(s.total) : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="table__empty">No marketplace activity yet.</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if user}
		<h3 class="section-title" style="margin:1.5rem 0 0.75rem;">Your stats</h3>

		<div class="card" style="margin-bottom:1.5rem;">
			<div class="dashboard__stats">
				<div class="stat-card"><span class="stat-value">{user.questsAsPlayer}</span><span class="stat-label">Quests as player</span></div>
				<div class="stat-card"><span class="stat-value">{user.questsAsDM}</span><span class="stat-label">Quests as DM</span></div>
				<div class="stat-card"><span class="stat-value">{gp(user.totalWealth)}</span><span class="stat-label">Total wealth</span></div>
				<div class="stat-card"><span class="stat-value">{user.purchasesCount}</span><span class="stat-label">Purchases</span></div>
				<div class="stat-card"><span class="stat-value">{gp(user.totalPurchases)}</span><span class="stat-label">Total spent</span></div>
				<div class="stat-card"><span class="stat-value">{gp(user.avgPurchase)}</span><span class="stat-label">Avg purchase</span></div>
				<div class="stat-card"><span class="stat-value">{user.salesCount}</span><span class="stat-label">Sales</span></div>
				<div class="stat-card"><span class="stat-value">{gp(user.totalSales)}</span><span class="stat-label">Total earned</span></div>
				<div class="stat-card"><span class="stat-value">{gp(user.avgSale)}</span><span class="stat-label">Avg sale</span></div>
			</div>
		</div>

		<!-- Per-character breakdown -->
		{#if user.charStats?.length}
			<div class="card">
				<h3 class="section-title">Per character</h3>
				<table class="table">
					<thead><tr><th>Character</th><th>Wealth</th><th>Purchases</th><th>Sales</th><th>Delta</th></tr></thead>
					<tbody>
						{#each user.charStats as c}
							<tr>
								<td class="table__name">{c.name}</td>
								<td>{gp(c.totalGold)}</td>
								<td>{gp(c.totalPurchases)}</td>
								<td>{gp(c.totalSales)}</td>
								<td style="color:{c.delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">{c.delta >= 0 ? '+' : ''}{gp(c.delta)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>