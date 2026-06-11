<!-- apps/admin/src/routes/(app)/token-store/transactions/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const txs    = $derived((data as any).txs ?? []);
	const status = $derived((data as any).status ?? '');
	let rejectId   = $state('');
	let rejectNote = $state('');
	let warningId  = $state('');
	let warningMsg = $state('');

	$effect(() => {
		if ((form as any)?.warning) { warningMsg = (form as any).warning; warningId = (form as any).id; }
	});

	const statusLabel: Record<string, string> = {
		PENDING: '⏳ Pending', APPROVED: '✅ Approved', REJECTED: '❌ Rejected', REVOKED: '🚫 Revoked',
	};
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">🪙 Token Store Transactions</h2>
		<div style="display:flex;gap:0.5rem;">
			{#each ['', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] as s}
				<button class="btn btn-sm {status === s ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => goto(`/token-store/transactions${s ? '?status=' + s : ''}`)}>
					{s || 'All'}
				</button>
			{/each}
		</div>
	</div>

	{#if (form as any)?.message}<p class="form-error">{(form as any).message}</p>{/if}

	<!-- Revoke warning modal -->
	{#if warningMsg}
		<div class="card" style="border-color:var(--color-danger);margin-bottom:1rem;padding:1rem;">
			<p style="font-weight:700;color:var(--color-danger);">⚠️ Warning</p>
			<p style="font-size:0.875rem;">{warningMsg}</p>
			<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
				<form method="post" action="?/revoke" use:enhance>
					<input type="hidden" name="id"      value={warningId} />
					<input type="hidden" name="confirm" value="true" />
					<button type="submit" class="btn btn-danger btn-sm">Revoke anyway</button>
				</form>
				<button class="btn btn-ghost btn-sm" onclick={() => { warningMsg = ''; warningId = ''; }}>Cancel</button>
			</div>
		</div>
	{/if}

	<!-- Reject modal -->
	{#if rejectId}
		<div class="card" style="margin-bottom:1rem;padding:1rem;max-width:480px;">
			<p style="font-weight:700;margin-bottom:0.5rem;">Reject purchase</p>
			<div class="field" style="margin-bottom:0.5rem;">
				<textarea class="input" rows="3" placeholder="Reason (required)" bind:value={rejectNote}></textarea>
			</div>
			<form method="post" action="?/reject" use:enhance>
				<input type="hidden" name="id"         value={rejectId} />
				<input type="hidden" name="reviewNote" value={rejectNote} />
				<div style="display:flex;gap:0.5rem;">
					<button type="submit" class="btn btn-danger btn-sm" disabled={!rejectNote.trim()}>Reject</button>
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => rejectId = ''}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}

	{#if !txs.length}
		<p class="table__empty">No transactions found.</p>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead><tr>
					<th>Item</th><th>Character</th><th>Cost</th><th>Status</th><th>Date</th><th></th>
				</tr></thead>
				<tbody>
					{#each txs as tx}
						<tr>
							<td><strong>{tx.item?.name ?? '—'}</strong></td>
							<td>{(tx as any).characterName ?? tx.characterId}</td>
							<td>🪙 {tx.tokenCostAtTransaction}</td>
							<td>{statusLabel[tx.status] ?? tx.status}</td>
							<td style="font-size:0.8125rem;color:var(--text-muted);">{new Date(tx.createdAt).toLocaleDateString()}</td>
							<td><div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
								{#if tx.status === 'PENDING'}
									<form method="post" action="?/approve" use:enhance>
										<input type="hidden" name="id" value={tx.id} />
										<button type="submit" class="btn btn-primary btn-sm">Approve</button>
									</form>
									<button class="btn btn-ghost btn-sm" onclick={() => { rejectId = tx.id; rejectNote = ''; }}>Reject</button>
								{/if}
								{#if tx.status === 'APPROVED'}
									{#if tx.item?.rewardType !== 'MANUAL'}
										<form method="post" action="?/recalculate" use:enhance>
											<input type="hidden" name="id" value={tx.id} />
											<button type="submit" class="btn btn-ghost btn-sm" title="Re-run retrospective boost">↻ Recalc</button>
										</form>
									{/if}
									<form method="post" action="?/revoke" use:enhance>
										<input type="hidden" name="id"      value={tx.id} />
										<input type="hidden" name="confirm" value="false" />
										<button type="submit" class="btn btn-danger btn-sm">Revoke</button>
									</form>
								{/if}
							</div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>