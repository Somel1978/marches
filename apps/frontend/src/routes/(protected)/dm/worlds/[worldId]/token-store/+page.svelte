<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/token-store/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const txs       = $derived((data as any).txs       ?? []);
	const canManage = $derived((data as any).canManage ?? false);
	let rejectId   = $state('');
	let rejectNote = $state('');

	const statusLabel: Record<string,string> = {
		PENDING: '⏳ Pending', APPROVED: '✅ Approved', REJECTED: '❌ Rejected', REVOKED: '🚫 Revoked',
	};
</script>

<div class="page">
	<h2 class="page__title">🪙 Token Store Transactions</h2>
	{#if (form as any)?.message}
		{#if (form as any)?.success}
			<p class="form-success">{(form as any).message}</p>
		{:else}
			<p class="form-error">{(form as any).message}</p>
		{/if}
	{/if}

	{#if rejectId}
		<div class="card" style="margin-bottom:1rem;max-width:480px;">
			<p style="font-weight:700;margin-bottom:0.5rem;">Reject purchase</p>
			<textarea class="input" rows="2" placeholder="Reason (required)" bind:value={rejectNote}></textarea>
			<form method="post" action="?/reject" use:enhance style="margin-top:0.5rem;">
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
		<p class="table__empty">No token store transactions for this world.</p>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead><tr>
					<th>Item</th><th>Character</th><th>Cost</th><th>Status</th><th>Date</th>
					{#if canManage}<th></th>{/if}
				</tr></thead>
				<tbody>
					{#each txs as tx}
						<tr>
							<td><strong>{tx.item?.name ?? '—'}</strong></td>
							<td>{(tx as any).characterName ?? tx.characterId}</td>
							<td>🪙 {tx.tokenCostAtTransaction}</td>
							<td>{statusLabel[tx.status] ?? tx.status}</td>
							<td class="table__muted" style="font-size:0.8125rem;">{new Date(tx.createdAt).toLocaleDateString()}</td>
							{#if canManage}
								<td>
									<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
										{#if tx.status === 'PENDING'}
											<form method="post" action="?/approve" use:enhance>
												<input type="hidden" name="id" value={tx.id} />
												<button type="submit" class="btn btn-primary btn-sm">Approve</button>
											</form>
											<button class="btn btn-ghost btn-sm" onclick={() => { rejectId = tx.id; rejectNote = ''; }}>Reject</button>
										{/if}
										{#if tx.status === 'APPROVED' && tx.item?.rewardType !== 'MANUAL'}
											<form method="post" action="?/recalculate" use:enhance>
												<input type="hidden" name="id" value={tx.id} />
												<button type="submit" class="btn btn-ghost btn-sm" title="Re-run retrospective boost">↻ Recalc</button>
											</form>
										{/if}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>