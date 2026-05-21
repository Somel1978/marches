<!-- apps/admin/src/routes/(app)/marketplace/transactions/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		PENDING:  'badge-warning',
		APPROVED: 'badge-success',
		REJECTED: 'badge-danger',
	};

	const typeColors: Record<string, string> = {
		BUY:    'badge-accent',
		SELL:   'badge-muted',
		REWARD: 'badge-success',
	};

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Marketplace Transactions</h2>
			<p class="page__subtitle">{data.total} total</p>
		</div>
	</div>

	<div class="toolbar">
		<a href="/marketplace/transactions" class="btn btn-ghost btn-sm">All</a>
		<a href="/marketplace/transactions?status=PENDING"  class="btn btn-ghost btn-sm">Pending</a>
		<a href="/marketplace/transactions?status=APPROVED" class="btn btn-ghost btn-sm">Approved</a>
		<a href="/marketplace/transactions?status=REJECTED" class="btn btn-ghost btn-sm">Rejected</a>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Done.</div>{/if}

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>Item</th>
					<th>Character</th>
					<th>Type</th>
					<th>Qty</th>
					<th>Price (GP)</th>
					<th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as tx}
					<tr>
						<td>
							<strong>{tx.item.name}</strong>
							<span class="table__muted" style="display:block; font-size:0.8125rem;">{tx.priceAtTransaction.toLocaleString()} GP each</span>
						</td>
						<td>
							<span>{(tx as any).character?.name ?? tx.characterId}</span>
							<span class="table__muted" style="display:block; font-size:0.8125rem;">{(tx as any).playerName}</span>
						</td>
						<td><span class="badge {typeColors[tx.type] ?? 'badge-muted'}">{tx.type}</span></td>
						<td>{tx.quantity}</td>
						<td><strong>{tx.totalPrice.toLocaleString()}</strong></td>
						<td><span class="badge {statusColors[tx.status] ?? 'badge-muted'}">{tx.status}</span></td>
						<td class="table__action">
							{#if tx.status === 'PENDING'}
								<div style="display:flex; gap:0.375rem; flex-wrap:wrap; justify-content:flex-end;">
									<form method="post" action="?/approve" use:enhance={e_reload}>
										<input type="hidden" name="id" value={tx.id} />
										<button type="submit" class="btn btn-primary btn-sm">Approve</button>
									</form>
									<form method="post" action="?/reject" use:enhance={e_reload}>
										<input type="hidden" name="id" value={tx.id} />
										<div style="display:flex; gap:0.25rem;">
											<input name="note" type="text" class="input" placeholder="Reason" required style="width:120px;" />
											<button type="submit" class="btn btn-danger btn-sm">Reject</button>
										</div>
									</form>
								</div>
							{:else}
								<span class="table__muted" style="font-size:0.8125rem;">{tx.reviewNote ?? '—'}</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="table__empty">No transactions.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>