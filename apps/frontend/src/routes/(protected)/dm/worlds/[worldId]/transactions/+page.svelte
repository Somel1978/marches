<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.svelte -->
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
		BUY:  'badge-accent',
		SELL: 'badge-muted',
		REWARD: 'badge-success',
	};

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}

	function filterUrl(status: string | null) {
		const p = new URLSearchParams();
		if (status) p.set('status', status);
		const qs = p.toString();
		return `?${qs}`;
	}

	const currentStatus = $derived((data as any).status ?? null);
</script>

<div style="margin-bottom:1.5rem;">
	<p class="page__subtitle">{data.total} total</p>
</div>

<!-- Status filter -->
<div class="card" style="margin-bottom:1.5rem; display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center;">
	<span class="label" style="margin-right:0.25rem;">Status</span>
	<a href={filterUrl(null)}          class="btn btn-sm {!currentStatus ? 'btn-primary' : 'btn-ghost'}">All</a>
	<a href={filterUrl('PENDING')}     class="btn btn-sm {currentStatus === 'PENDING'  ? 'btn-primary' : 'btn-ghost'}">Pending</a>
	<a href={filterUrl('APPROVED')}    class="btn btn-sm {currentStatus === 'APPROVED' ? 'btn-primary' : 'btn-ghost'}">Approved</a>
	<a href={filterUrl('REJECTED')}    class="btn btn-sm {currentStatus === 'REJECTED' ? 'btn-primary' : 'btn-ghost'}">Rejected</a>
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
