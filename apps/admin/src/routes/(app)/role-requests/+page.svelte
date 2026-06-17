<!-- apps/admin/src/routes/(app)/role-requests/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		PENDING:  'badge-warning',
		APPROVED: 'badge-success',
		REJECTED: 'badge-danger',
	};

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	const pending  = $derived(data.requests.filter((r: any) => r.status === 'PENDING'));
	const resolved = $derived(data.requests.filter((r: any) => r.status !== 'PENDING'));

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Role Requests</h2>
			<p class="page__subtitle">{pending.length} pending</p>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Request updated.</div>{/if}

	{#if pending.length}
		<h3 class="section-title">Pending</h3>
		<div class="table-wrap card" style="margin-bottom:1.5rem;">
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>User</th>
						<th>Role</th>
						<th class="col-hide-mobile">Reason</th>
						<th>Date</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each pending as req}
						<tr>
							<td>
								<a href="/users/{req.userId}" class="table__name">{req.user?.name ?? req.userId}</a>
								<span class="table__muted" style="display:block; font-size:0.8125rem;">{req.user?.email ?? ''}</span>
							</td>
							<td><span class="badge badge-accent">{req.role?.name ?? req.roleId}</span></td>
							<td class="table__muted col-hide-mobile">{req.reason}</td>
							<td class="table__muted">{formatDate(req.createdAt)}</td>
							<td class="table__action">
								<div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:flex-end;">
									<form method="post" action="?/approve"
										use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="id" value={req.id} />
										<button type="submit" class="btn btn-primary btn-sm">Approve</button>
									</form>
									<form method="post" action="?/delete"
										use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }} id="cf-req-{req.id}">
										<input type="hidden" name="id" value={req.id} />
										<button type="submit" class="btn btn-ghost btn-sm btn-icon"
											aria-label="Delete">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
											</svg>
										</button>
									</form>
									<form method="post" action="?/reject"
										use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="id" value={req.id} />
										<div style="display:flex; gap:0.375rem; align-items:center; flex-wrap:wrap">
											<input name="note" type="text" class="input" placeholder="Reason" required style="width:160px;" />
											<button type="submit" class="btn btn-danger btn-sm">Reject</button>
										</div>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>
	{:else}
		<div class="card" style="text-align:center; padding:2rem; margin-bottom:1.5rem;">
			<p class="table__muted">No pending role requests.</p>
		</div>
	{/if}

	{#if resolved.length}
		<h3 class="section-title">Resolved</h3>
		<div class="table-wrap card">
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>User</th>
						<th>Role</th>
						<th>Status</th>
						<th class="col-hide-mobile">Review note</th>
						<th>Date</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each resolved as req}
						<tr>
							<td><a href="/users/{req.userId}" class="table__name">{req.user?.name ?? req.userId}</a></td>
							<td><span class="badge badge-accent">{req.role?.name ?? req.roleId}</span></td>
							<td><span class="badge {statusColors[req.status] ?? 'badge-muted'}">{req.status}</span></td>
							<td class="table__muted col-hide-mobile">{req.reviewNote ?? '—'}</td>
							<td class="table__muted">{formatDate(req.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>
	{/if}
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>