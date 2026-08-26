<!-- apps/admin/src/routes/(app)/token-store/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const items = $derived((data as any).items ?? []);

	const rewardLabel: Record<string, string> = {
		XP_BOOST: '⭐ Quest XP Boost', GOLD_BOOST: '💰 Quest GP Boost', MANUAL: '📋 Manual',
	};
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">🪙 Token Store</h2>
		<div style="display:flex;gap:0.5rem;">
			<a href="/token-store/data/import" class="btn btn-ghost btn-sm">⬆ Import</a>
			<a href="/token-store/data/export" class="btn btn-ghost btn-sm">⬇ Export</a>
			<a href="/token-store/transactions" class="btn btn-ghost btn-sm">📋 Transactions</a>
			<a href="/token-store/items/new" class="btn btn-primary btn-sm">+ New Item</a>
		</div>
	</div>

	{#if !items.length}
		<p class="table__empty">No token store items yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead><tr>
					<th>Name</th><th>Cost</th><th>Reward</th><th>Scope</th><th>System</th><th>Stock</th><th>Status</th><th></th>
				</tr></thead>
				<tbody>
					{#each items as item}
						<tr>
							<td><strong>{item.name}</strong></td>
							<td>🪙 {item.tokenCost}</td>
							<td>{rewardLabel[item.rewardType] ?? item.rewardType}</td>
							<td><span class="badge badge-muted">{item.scope}</span></td>
							<td>{item.gameSystemName ?? (item.gameSystemId ? item.gameSystemId : '—')}</td>
							<td>{item.stock ?? '∞'}</td>
							<td>
								{#if item.isActive}
									<span class="badge badge-success-dim">Active</span>
								{:else}
									<span class="badge badge-muted">Inactive</span>
								{/if}
							</td>
							<td><a href="/token-store/items/{item.id}" class="btn btn-ghost btn-sm">Edit</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>