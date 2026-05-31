<!-- apps/admin/src/routes/(app)/quests/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		DRAFT:            'badge-muted',
		PENDING_APPROVAL: 'badge-warning',
		PUBLISHED:        'badge-success',
		IN_PROGRESS:      'badge-accent',
		PENDING_RESULT:            'badge-warning',
		PENDING_RESULT_APPROVAL:   'badge-accent',
		COMPLETED:        'badge-success',
		CANCELLED:        'badge-danger',
	};

	let showDeleteModal  = $state(false);
	let revertRewards    = $state(false);
	let deleteFormEl     = $state<HTMLFormElement | null>(null);

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}

	type RewardRow = { type: string; amount: number; itemRarity?: string; itemCategory?: string; itemMaxValue?: number };
	let rewardRows = $state<RewardRow[]>([]);
	$effect.pre(() => {
		rewardRows = data.quest.rewards.length
			? data.quest.rewards.map((r: any) => ({
				type:         r.type,
				amount:       r.amount,
				itemRarity:   r.itemRarity   ?? undefined,
				itemCategory: r.itemCategory ?? undefined,
				itemMaxValue: r.itemMaxValue  ?? undefined,
			}))
			: [{ type: 'XP', amount: 0 }];
	});

	// Region/location selectors
	const _allWorlds = $derived(((data as any).allWorlds ?? []) as any[]);
	let selectedWorldId    = $state('');
	let selectedRegionId   = $state('');
	let selectedLocationId = $state('');

	$effect.pre(() => {
		const allW = (data as any).allWorlds ?? [];
		const rid  = (data.quest as any)?.regionId   ?? '';
		const lid  = (data.quest as any)?.locationId ?? '';
		selectedRegionId   = rid;
		selectedLocationId = lid;
		selectedWorldId    = rid
			? allW.find((w: any) => w.regions?.some((r: any) => r.id === rid))?.id ?? ''
			: '';
	});

	const selectedWorld   = $derived(_allWorlds.find((w: any) => w.id === selectedWorldId));
	const regionOptions   = $derived((selectedWorld?.regions ?? []) as any[]);
	const locationOptions = $derived(
		regionOptions.find((r: any) => r.id === selectedRegionId)?.locations ?? [] as any[]
	);
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

	<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
		{#if (data.quest as any).regionName}
			<div style="display:flex; align-items:center; gap:0.375rem; font-size:0.875rem; flex-wrap:wrap">
				<span>📍</span>
				{#if (data.quest as any).worldName}
					<span style="color:var(--text-secondary);">{(data.quest as any).worldName}</span>
					<span style="color:var(--text-muted);">›</span>
				{/if}
				<span style="color:var(--text-secondary);">{(data.quest as any).regionName}</span>
				{#if (data.quest as any).locationName}
					<span style="color:var(--text-muted);">·</span>
					<span style="color:var(--text-muted);">{(data.quest as any).locationName}</span>
				{/if}
			</div>
		{/if}
		{#if (data.quest as any).dmName}
			<span style="font-size:0.875rem; color:var(--text-muted);">DM: <strong style="color:var(--text-secondary);">{(data.quest as any).dmName}</strong></span>
		{/if}
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
	{#if data.quest.status === 'PENDING_APPROVAL' && !(data.quest.result)}
		<div class="pending-banner">
			<p>{data.quest.rewardAdjusted ? 'Quest rewards were adjusted — re-approval required.' : 'Quest is awaiting approval.'}</p>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
				<form method="post" action="?/approve" use:enhance={e_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve & Publish</button>
				</form>
				<form method="post" action="?/reject" use:enhance={e_reload}>
					<div style="display:flex; gap:0.375rem; align-items:center; flex-wrap:wrap">
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
					<button type="submit" class="btn btn-primary btn-sm">Approve & Distribute Rewards</button>
				</form>
				<form method="post" action="?/rejectResult" use:enhance={e_reload}>
					<div style="display:flex; gap:0.375rem; align-items:center; flex-wrap:wrap">
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

					<!-- Region & Location -->
					<div class="field">
						<label class="label" for="q-world">World <span class="optional">(optional)</span></label>
						<select id="q-world" class="input input--select"
							bind:value={selectedWorldId}
							onchange={() => { selectedRegionId = ''; selectedLocationId = ''; }}>
							<option value="">No world</option>
							{#each ((data as any).allWorlds ?? []) as w}
								<option value={w.id} selected={w.id === selectedWorldId}>{w.name}</option>
							{/each}
						</select>
					</div>
					{#if regionOptions.length}
						<div class="field">
							<label class="label" for="q-region">Region</label>
							<select id="q-region" name="regionId" class="input input--select"
								bind:value={selectedRegionId}
								onchange={() => selectedLocationId = ''}>
								<option value="">None</option>
								{#each regionOptions as r}
									<option value={r.id} selected={r.id === selectedRegionId}>{r.name}</option>
								{/each}
							</select>
						</div>
					{:else}
						<input type="hidden" name="regionId" value={selectedRegionId} />
					{/if}
					{#if locationOptions.length}
						<div class="field">
							<label class="label" for="q-location">Location <span class="optional">(optional)</span></label>
							<select id="q-location" name="locationId" class="input input--select"
								bind:value={selectedLocationId}>
								<option value="">None</option>
								{#each locationOptions as l}
									<option value={l.id} selected={l.id === selectedLocationId}>{l.name}</option>
								{/each}
							</select>
						</div>
					{:else}
						<input type="hidden" name="locationId" value={selectedLocationId} />
					{/if}
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
									<option value="ITEM">Random item</option>
								</select>
							</div>
							<div class="field" style="flex:2; min-width:100px;">
								<label class="label" for="ra-{i}">Amount</label>
								<input id="ra-{i}" name="rewardAmount" type="number" class="input" min="0" bind:value={r.amount} />
							</div>
							{#if r.type === 'ITEM'}
								<div style="display:flex; gap:0.5rem; flex-wrap:wrap; padding:0.5rem 0; width:100%;">
									<div class="field" style="flex:1 1 120px;">
										<label class="label" for="rrar-{i}">Rarity filter</label>
										<select id="rrar-{i}" name="itemRarity_{i}" class="input input--select"
											bind:value={rewardRows[i].itemRarity}>
											<option value={undefined}>Any rarity</option>
											{#each (data as any).itemRarities ?? [] as rar}
												<option value={rar}>{rar.replace('_',' ')}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:1 1 120px;">
										<label class="label" for="rcat-{i}">Category filter</label>
										<select id="rcat-{i}" name="itemCategory_{i}" class="input input--select"
											bind:value={rewardRows[i].itemCategory}>
											<option value={undefined}>Any category</option>
											{#each (data as any).itemCategories ?? [] as cat}
												<option value={cat}>{cat}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:1 1 100px;">
										<label class="label" for="rmv-{i}">Max value (gp)</label>
										<input id="rmv-{i}" name="itemMaxValue_{i}" type="number" class="input" min="0"
											bind:value={rewardRows[i].itemMaxValue}
											placeholder="No limit" />
									</div>
								</div>
							{/if}
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
				{/each}
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
				<div class="table-wrap">
					<table class="table">
					<thead><tr><th>Character</th><th>XP</th><th>Gold</th><th>Tokens</th><th>Item</th></tr></thead>
					<tbody>
						{#each data.quest.result.characters as rc}
							<tr>
								<td>{data.quest.signups.find((s: any) => s.characterId === rc.characterId)?.character?.name ?? rc.characterId}</td>
								<td>{rc.xpAwarded.toLocaleString()}</td>
								<td>{rc.goldAwarded.toLocaleString()}</td>
								<td>{rc.tokensAwarded.toLocaleString()}</td>
								<td>{(rc as any).itemGrantedName ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
</div>
			{/if}
		</div>
	{/if}
	<!-- Danger zone -->

	<!-- Item usage approvals -->
	{#if (data as any).itemUsages?.length}
		<div class="card">
			<h3 class="section-title">Item usage submissions</h3>
			<div class="table-wrap">
				<table class="table">
				<thead><tr><th>Character</th><th>Random item</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead>
				<tbody>
					{#each (data as any).itemUsages as u}
						<tr>
							<td>{u.characterName}</td>
							<td>{u.itemName}</td>
							<td>{u.quantityUsed}</td>
							<td><span class="badge badge-{u.status === 'APPROVED' ? 'success' : u.status === 'REJECTED' ? 'danger' : 'warning'}">{u.status}</span></td>
							<td>
								<span class="table__muted">Processed on result approval</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>
	{/if}

	<div class="card" style="border-color:var(--color-danger); margin-top:1.5rem;">
		<h3 class="section-title" style="color:var(--color-danger);">Danger zone</h3>
		<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
			Permanently deletes this quest and all signups, rewards and results. Cannot be undone.
		</p>
		<button type="button" class="btn btn-danger btn-sm" onclick={() => showDeleteModal = true}>
			Delete quest permanently
		</button>

		<form bind:this={deleteFormEl} method="post" action="?/deleteQuest" style="display:none;"
			use:enhance={() => { return async ({ update }) => { await update(); }; }}>
			<input type="hidden" name="revertRewards" value={revertRewards} />
		</form>
	</div>

	<ConfirmModal
		open={showDeleteModal}
		title="Delete quest permanently"
		message={"This will permanently delete \"" + data.quest.title + "\" and all signups, rewards and results. This cannot be undone."}
		confirmLabel="Delete permanently"
		confirmClass="btn-danger"
		onconfirm={() => {
			showDeleteModal = false;
			const input = deleteFormEl?.querySelector('input[name="revertRewards"]') as HTMLInputElement | null;
			if (input) input.value = String(revertRewards);
			deleteFormEl?.requestSubmit();
		}}
		oncancel={() => { showDeleteModal = false; revertRewards = false; }}>
		{#snippet extra()}
			{#if data.quest.status === 'COMPLETED'}
				<label style="display:flex; align-items:flex-start; gap:0.625rem; margin-bottom:1rem; cursor:pointer; font-size:0.875rem; color:var(--text-secondary); flex-wrap:wrap">
					<input type="checkbox" style="margin-top:2px; flex-shrink:0;"
						checked={revertRewards}
						onchange={(e) => revertRewards = (e.currentTarget as HTMLInputElement).checked} />
					Also revert XP, gold and tokens granted to characters (gold may go negative)
				</label>
			{/if}
		{/snippet}
	</ConfirmModal>
</div>