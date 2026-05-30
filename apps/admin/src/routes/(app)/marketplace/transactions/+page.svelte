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

	// Build filter URL preserving other params
	function filterUrl(params: Record<string, string | null>) {
		const p = new URLSearchParams();
		const current: Record<string, string | null> = {
			status:  (data as any).status  ?? null,
			worldId: (data as any).worldId ?? null,
		};
		const merged = { ...current, ...params };
		for (const [k, v] of Object.entries(merged)) {
			if (v) p.set(k, v);
		}
		const qs = p.toString();
		return `/marketplace/transactions${qs ? '?' + qs : ''}`;
	}

	const currentStatus  = $derived((data as any).status  ?? null);
	const currentWorldId = $derived((data as any).worldId ?? null);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Marketplace Transactions</h2>
			<p class="page__subtitle">{data.total} total</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="card" style="margin-bottom:1.5rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:flex-end;">
		<!-- Status filter -->
		<div class="field" style="margin:0; flex:0 0 auto;">
			<span class="label">Status</span>
			<div style="display:flex; gap:0.375rem; flex-wrap:wrap; margin-top:0.25rem;">
				<a href={filterUrl({ status: null })} class="btn btn-sm {!currentStatus ? 'btn-primary' : 'btn-ghost'}">All</a>
				<a href={filterUrl({ status: 'PENDING' })}  class="btn btn-sm {currentStatus === 'PENDING'  ? 'btn-primary' : 'btn-ghost'}">Pending</a>
				<a href={filterUrl({ status: 'APPROVED' })} class="btn btn-sm {currentStatus === 'APPROVED' ? 'btn-primary' : 'btn-ghost'}">Approved</a>
				<a href={filterUrl({ status: 'REJECTED' })} class="btn btn-sm {currentStatus === 'REJECTED' ? 'btn-primary' : 'btn-ghost'}">Rejected</a>
			</div>
		</div>

		<!-- World filter -->
		<div class="field" style="margin:0; flex:1; min-width:180px; max-width:260px;">
			<label class="label" for="worldFilter">World</label>
			<select id="worldFilter" class="input input--select"
				onchange={(e) => { window.location.href = filterUrl({ worldId: (e.target as HTMLSelectElement).value || null }); }}>
				<option value="">All worlds</option>
				<option value="global" selected={currentWorldId === 'global'}>Global (no world)</option>
				{#each ((data as any).activeWorlds ?? []) as w}
					<option value={(w as any).id} selected={currentWorldId === (w as any).id}>{(w as any).name}</option>
				{/each}
			</select>
		</div>

		{#if currentStatus || currentWorldId}
			<div style="padding-top:1.25rem;">
				<a href="/marketplace/transactions" class="btn btn-ghost btn-sm">Clear filters</a>
			</div>
		{/if}
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Done.</div>{/if}

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>Item</th>
					<th>Character</th>
					<th>World</th>
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
						<td>
							{#if (tx as any).worldName}
								<span class="badge badge-accent">{(tx as any).worldName}</span>
							{:else}
								<span class="table__muted">Global</span>
							{/if}
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
					<tr><td colspan="8" class="table__empty">No transactions.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>