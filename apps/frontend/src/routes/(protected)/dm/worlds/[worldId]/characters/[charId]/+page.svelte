<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DmDnd5eSheetSection from './_sheets/DmDnd5eSheetSection.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const char          = $derived((data as any).character);
	const canManage     = $derived((data as any).canManage === true);
	const isDnd5e       = $derived((data.gameSystem as any)?.slug === 'dnd5e');
	const charSheet     = $derived((data as any).charSheet);
	const systemData    = $derived((data as any).systemData);
	const isPending     = $derived(char.status === 'PENDING');
	const isResting     = $derived(char.status === 'RESTING');
	const isEditPending = $derived(char.statusReason === 'EDIT_PENDING');
	const isLevelUp     = $derived(char.statusReason === 'LEVEL_UP_PENDING');
	const isLevelDown   = $derived(char.statusReason === 'LEVEL_DOWN_PENDING');
	const needsReview   = $derived(isPending || isEditPending);
	const totalLevel    = $derived((char as any).level ?? 0);
	const thresholds    = $derived((data as any).progressionThresholds ?? []);
	const earnedLevel   = $derived(thresholds.filter((t: any) => char.totalXp >= t.xpRequired).length);

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
	<a href="/dm/worlds/{char.worldId}/characters" class="back-link">← Characters</a>
	{#if (data as any).owner}
		<span class="table__muted" style="font-size:0.875rem;">Player: {(data as any).owner.name}</span>
	{/if}
</div>

{#if form?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if (form as any)?.approveSuccess}<div class="form-success">Character approved.</div>{/if}
{#if (form as any)?.rejectSuccess}<div class="form-success">Character rejected.</div>{/if}
{#if (form as any)?.statusSuccess}<div class="form-success">Character status updated.</div>{/if}

<!-- Pending banner -->
{#if needsReview && canManage}
	<div class="card" style="margin-bottom:1rem;border-color:var(--color-warning);background:color-mix(in srgb,var(--color-warning) 8%,transparent);">
		<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
			<div>
				<strong>{isEditPending ? 'Edit pending review' : 'New character pending approval'}</strong>
				{#if isEditPending}<p class="field-hint" style="margin-top:0.25rem;">Review the sheet below. Approve to apply, reject to discard.</p>{/if}
			</div>
			<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
				<form method="post" action="?/approve" use:enhance={e_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve</button>
				</form>
				<form method="post" action="?/reject" use:enhance={e_reload} style="display:flex;gap:0.25rem;flex-wrap:wrap;">
					<input name="note" type="text" class="input" placeholder="Rejection reason" required style="width:180px;" />
					<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" >Reject</button>
				</form>
			</div>
		</div>
	</div>
{:else if needsReview}
	<div class="card" style="margin-bottom:1rem;border-color:var(--color-warning);">
		<span class="badge badge-warning">{isEditPending ? 'Edit pending approval' : 'Pending approval'}</span>
		<span class="field-hint" style="margin-left:0.5rem;">Awaiting review.</span>
	</div>
{/if}

<!-- Character header -->
<div class="card" style="margin-bottom:1rem;">
	<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
		{#if char.avatarUrl}
			<img src={char.avatarUrl} alt={char.name} style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
		{/if}
		<div style="flex:1;">
			<h3 style="margin:0;font-size:1.25rem;">{char.name}</h3>
			<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.25rem;">
				<span class="badge badge-accent">Level {totalLevel}</span>
				<span class="badge badge-muted">{char.status}</span>
				{#if isLevelUp}<span class="badge badge-warning">Level {earnedLevel} available</span>{/if}
			</div>
			<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem;">
				<span class="table__muted">{char.totalGold?.toLocaleString() ?? 0} GP</span>
				<span class="table__muted">{char.totalXp?.toLocaleString() ?? 0} XP</span>
				<span class="table__muted">{char.totalTokens?.toLocaleString() ?? 0} Tokens</span>
			</div>
		</div>
	</div>
</div>

<!-- Status management (canManage DMs) -->
{#if canManage && (isResting || char.status === 'ACTIVE')}
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title" style="margin-bottom:0.75rem;">Status Management</h3>
		<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
			<span>Current: <strong>{char.status}</strong>{#if char.restUntil} (until {new Date(char.restUntil).toLocaleDateString()}){/if}</span>
			{#if isResting}
				<form method="post" action="?/updateStatus" use:enhance>
					<input type="hidden" name="status" value="ACTIVE" />
					<input type="hidden" name="note" value="Manually cleared by DM" />
					<button type="submit" class="btn btn-primary btn-sm">Clear Rest → Active</button>
				</form>
			{:else if char.status === 'ACTIVE'}
				<form method="post" action="?/updateStatus" use:enhance>
					<input type="hidden" name="status" value="RESTING" />
					<input type="hidden" name="note" value="Set to resting by DM" />
					<button type="submit" class="btn btn-ghost btn-sm">Set Resting</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- dnd5e sheet -->
{#if isDnd5e && charSheet}
	<DmDnd5eSheetSection
		{charSheet}
		{systemData}
		scoreAudit={(data as any).scoreAudit ?? []}
		{canManage}
		canViewDescriptions={(data as any).canViewDescriptions ?? false}
		{isLevelUp}
		{isLevelDown}
		availableLevel={earnedLevel}
	/>
{/if}

<!-- Inventory -->
{#if (data as any).inventory?.length}
	<div class="card">
		<h3 class="section-title">Inventory ({(data as any).inventory.length} items)</h3>
		<div class="table-wrap">
			<table class="table">
				<thead><tr><th>Item</th><th>Qty</th><th>Origin</th></tr></thead>
				<tbody>
					{#each (data as any).inventory as slot}
						<tr>
							<td style="font-weight:500;">{slot.itemName}</td>
							<td class="table__muted">{slot.quantity}</td>
							<td class="table__muted" style="font-size:0.8125rem;">{slot.source ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}