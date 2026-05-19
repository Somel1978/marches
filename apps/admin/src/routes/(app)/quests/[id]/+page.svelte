<!-- apps/admin/src/routes/(app)/quests/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		DRAFT:            'badge-muted',
		PENDING_APPROVAL: 'badge-warning',
		PUBLISHED:        'badge-success',
		IN_PROGRESS:      'badge-accent',
		PENDING_RESULT:   'badge-warning',
		COMPLETED:        'badge-success',
		CANCELLED:        'badge-danger',
	};

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}

	type RewardRow = { type: string; amount: number };
	let rewardRows = $state<RewardRow[]>([]);
	$effect.pre(() => {
		rewardRows = data.quest.rewards.length
			? data.quest.rewards.map(r => ({ type: r.type, amount: r.amount }))
			: [{ type: 'XP', amount: 0 }];
	});
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/quests" class="back-link">← Quests</a>
			<h2 class="page__title">{data.quest.title}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.quest.status] ?? 'badge-muted'}">{data.quest.status.replace('_', ' ')}</span>
				{#if data.quest.rewardAdjusted}
					<span class="badge badge-warning">Rewards changed — re-approval needed</span>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">
		{#if (form as any).action === 'rewards_updated'}Rewards updated.
		{:else if (form as any).action === 'details_updated'}Details updated.
		{:else if (form as any).action === 'approved'}Quest approved and published.
		{:else if (form as any).action === 'rejected'}Quest rejected.
		{:else if (form as any).action === 'result_approved'}Result approved — XP distributed.
		{:else if (form as any).action === 'result_rejected'}Result rejected — DM must resubmit.
		{/if}
	</div>{/if}

	<!-- Approval banner -->
	{#if data.quest.status === 'PENDING_APPROVAL'}
		<div class="pending-banner">
			<p>{data.quest.rewardAdjusted ? 'Quest rewards were adjusted — re-approval required.' : 'Quest is awaiting approval.'}</p>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
				<form method="post" action="?/approve" use:enhance={e_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve & Publish</button>
				</form>
				<form method="post" action="?/reject" use:enhance={e_reload}>
					<div style="display:flex; gap:0.375rem; align-items:center;">
						<input name="note" type="text" class="input" placeholder="Reason" required style="width:220px;" />
						<button type="submit" class="btn btn-danger btn-sm">Reject</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Result approval banner -->
	{#if data.quest.result?.status === 'PENDING_APPROVAL'}
		<div class="pending-banner">
			<p>Quest result submitted — awaiting approval. XP per player: <strong>{Math.floor(data.quest.result.missionXp / (data.quest.result.characters.length || 1))}</strong></p>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
				<form method="post" action="?/approveResult" use:enhance={e_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve & Distribute XP</button>
				</form>
				<form method="post" action="?/rejectResult" use:enhance={e_reload}>
					<div style="display:flex; gap:0.375rem; align-items:center;">
						<input name="note" type="text" class="input" placeholder="Reason" required style="width:220px;" />
						<button type="submit" class="btn btn-danger btn-sm">Reject</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Details</h3>
			{#if data.quest.description}
				<p style="font-size:0.875rem; color:var(--text-secondary); margin:0 0 0.75rem; white-space:pre-wrap;">{data.quest.description}</p>
			{/if}
			{#if data.quest.reviewNote}
				<div class="form-error" style="margin-bottom:0.75rem;">Review note: {data.quest.reviewNote}</div>
			{/if}
			<form method="post" action="?/updateDetails" use:enhance={e_reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="missionXp">Mission XP</label>
						<input id="missionXp" name="missionXp" type="number" class="input" min="0" value={data.quest.missionXp} required />
					</div>
					<div style="display:flex; gap:1rem; flex-wrap:wrap;">
						<div class="field" style="flex:1; min-width:100px;">
							<label class="label" for="minCap">Min players</label>
							<input id="minCap" name="minCapacity" type="number" class="input" min="1" value={data.quest.minCapacity} required />
						</div>
						<div class="field" style="flex:1; min-width:100px;">
							<label class="label" for="maxCap">Max players</label>
							<input id="maxCap" name="maxCapacity" type="number" class="input" min="1" value={data.quest.maxCapacity} required />
						</div>
					</div>
					<div style="display:flex; gap:1rem; flex-wrap:wrap;">
						<div class="field" style="flex:1; min-width:100px;">
							<label class="label" for="minLv">Min level</label>
							<input id="minLv" name="minLevel" type="number" class="input" min="1" max="20" value={data.quest.minLevel} required />
						</div>
						<div class="field" style="flex:1; min-width:100px;">
							<label class="label" for="maxLv">Max level</label>
							<input id="maxLv" name="maxLevel" type="number" class="input" min="1" max="20" value={data.quest.maxLevel} required />
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save details</button>
				</div>
			</form>
		</div>

		<div class="card">
			<h3 class="section-title">Rewards</h3>
			{#if data.quest.rewardAdjusted}
				<div class="form-error" style="margin-bottom:0.75rem;">Rewards were changed after approval — re-approval required.</div>
			{/if}
			<form method="post" action="?/updateRewards"
				use:enhance={e_reload}>
				<div class="class-alloc-list">
					{#each rewardRows as r, i}
						<div class="class-alloc-row">
							<div class="field" style="flex:2; min-width:100px;">
								<label class="label" for="rt-{i}">Type</label>
								<select id="rt-{i}" name="rewardType" class="input" bind:value={r.type}>
									<option value="XP">XP</option>
									<option value="GOLD">Gold</option>
									<option value="TOKEN">Tokens</option>
									<option value="ITEM">Item (placeholder)</option>
								</select>
							</div>
							<div class="field" style="flex:2; min-width:100px;">
								<label class="label" for="ra-{i}">Amount</label>
								<input id="ra-{i}" name="rewardAmount" type="number" class="input" min="0" bind:value={r.amount} />
							</div>
							<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
								onclick={() => rewardRows = rewardRows.filter((_, idx) => idx !== i)} aria-label="Remove">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
				<div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; flex-wrap:wrap; gap:0.5rem;">
					<button type="button" class="btn btn-ghost btn-sm"
						onclick={() => rewardRows = [...rewardRows, { type: 'GOLD', amount: 0 }]}>+ Add reward</button>
					<button type="submit" class="btn btn-primary btn-sm">Save rewards</button>
				</div>
			</form>
		</div>
	</div>

	<!-- Rewards per player breakdown -->
	<div class="card">
		<h3 class="section-title">Rewards per player</h3>
		<div style="margin-bottom:0.875rem;">
			<p style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.375rem;">
				<span class="badge badge-muted" style="margin-right:0.375rem;">XP</span>
				{data.quest.missionXp.toLocaleString()} total
			</p>
			<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
				{#each Array.from({ length: data.quest.maxCapacity - data.quest.minCapacity + 1 }, (_, i) => data.quest.minCapacity + i) as n}
					<div class="character-class-tag">
						<span class="table__muted">{n}p:</span>
						<strong>{Math.max(1, Math.floor(data.quest.missionXp / n))}</strong>
					</div>
				{/each}
			</div>
		</div>
		{#each data.quest.rewards.filter(r => r.type !== 'ITEM' && r.amount > 0) as r}
			<div style="margin-bottom:0.875rem;">
				<p style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.375rem;">
					<span class="badge badge-muted" style="margin-right:0.375rem;">{r.type}</span>
					{r.amount.toLocaleString()} total
				</p>
				<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
					{#each Array.from({ length: data.quest.maxCapacity - data.quest.minCapacity + 1 }, (_, i) => data.quest.minCapacity + i) as n}
						<div class="character-class-tag">
							<span class="table__muted">{n}p:</span>
							<strong>{Math.max(1, Math.floor(r.amount / n))}</strong>
						</div>
					{/each}
				</div>
			</div>
		{/each}
		{#each data.quest.rewards.filter(r => r.type === 'ITEM') as r}
			<div class="character-class-tag">
				<span class="badge badge-muted">ITEM</span>
				<span>{r.itemName ?? 'Item'} × 1 per player</span>
			</div>
		{/each}
	</div>

	<!-- Signups -->
	<div class="card">
		<h3 class="section-title">Signups ({data.quest.signups.length})</h3>
		{#if data.quest.signups.length}
			<div style="display:flex; flex-direction:column; gap:0.625rem;">
				{#each data.quest.signups as s}
				<div class="signup-card">
					<div class="signup-card__left">
						<div class="signup-card__level">{(s as any).character?.totalLevel ?? '?'}</div>
						<div class="signup-card__info">
							<p class="signup-card__name">{(s as any).character?.name ?? s.characterId}</p>
							<p class="signup-card__player">{(s as any).character?.playerName ?? ''}</p>
							<div class="signup-card__meta">
								{#if (s as any).character?.species}<span>Race: {(s as any).character.species}</span>{/if}
								{#if (s as any).character?.classes?.length}<span>Class: {(s as any).character.classes.map((c: any) => c.subclass ? `${c.name} (${c.subclass})` : c.name).join(' / ')}</span>{/if}
							</div>
							<p class="signup-card__date">Signed up {new Date(s.signedUpAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
						</div>
					</div>
					{#if (s as any).character?.avatarUrl}
						<img src={(s as any).character.avatarUrl} alt="" class="signup-card__avatar" />
					{:else}
						<div class="signup-card__avatar--placeholder">⚔</div>
					{/if}
					<div class="signup-card__status">
						<span class="badge {s.status === 'CONFIRMED' ? 'badge-success' : s.status === 'WAITLIST' ? 'badge-muted' : 'badge-warning'}">{s.status.replace('_', ' ')}</span>
					</div>
				</div>
				{/each}}
			</div>
		{:else}
			<p class="table__empty">No signups yet.</p>
		{/if}
	</div>

	<!-- Result -->
	{#if data.quest.result}
		<div class="card">
			<h3 class="section-title">Result</h3>
			<div class="fields" style="margin-bottom:1rem;">
				<div class="field"><span class="label">Mission XP</span><strong>{data.quest.result.missionXp.toLocaleString()}</strong></div>
				<div class="field"><span class="label">Status</span><span class="badge badge-muted">{data.quest.result.status}</span></div>
				{#if data.quest.result.reviewNote}<div class="field"><span class="label">Review note</span><span class="table__muted">{data.quest.result.reviewNote}</span></div>{/if}
			</div>
			{#if data.quest.result.characters.length}
				<table class="table">
					<thead><tr><th>Character</th><th>XP</th><th>Gold</th><th>Tokens</th></tr></thead>
					<tbody>
						{#each data.quest.result.characters as rc}
							<tr>
								<td>{rc.characterId}</td>
								<td>{rc.xpAwarded.toLocaleString()}</td>
								<td>{rc.goldAwarded.toLocaleString()}</td>
								<td>{rc.tokensAwarded.toLocaleString()}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
	<!-- Danger zone -->
	<div class="card" style="border-color:var(--color-danger); margin-top:1.5rem;">
		<h3 class="section-title" style="color:var(--color-danger);">Danger zone</h3>
		<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
			Permanently deletes this quest and all signups, rewards and results. Cannot be undone.
		</p>
		<form method="post" action="?/deleteQuest"
			use:enhance={({ cancel }) => { if (!confirm('Permanently delete this quest?')) { cancel(); return; } return async ({ update }) => { await update(); }; }}>
			<button type="submit" class="btn btn-danger btn-sm">Delete quest permanently</button>
		</form>
	</div>
</div>