<!-- apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const canApprove = $derived((data as any).canApprove === true);

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

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}

	type RewardRow = { id?: string; type: string; amount: number; itemRarity?: string; itemCategory?: string; itemMaxValue?: number };
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
			: [{ type: 'GOLD', amount: 0 }];
	});

	const isReadOnly = $derived(['COMPLETED', 'CANCELLED'].includes(data.quest.status));
	const confirmed = $derived(data.quest.signups.filter((s: any) => s.status === 'CONFIRMED'));
	const waitlist  = $derived(data.quest.signups.filter((s: any) => s.status === 'WAITLIST'));
	const pending   = $derived(data.quest.signups.filter((s: any) => s.status === 'PENDING_CONFIRMATION'));

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
	const worldsWithRegions = $derived((_allWorlds as any[]).filter((w: any) => w.regions?.length > 0));
	const regionOptions   = $derived((selectedWorld?.regions ?? []) as any[]);
	const questRatings  = $derived(((data as any).questRatings ?? []) as any[]);
	const ratingsAvg    = $derived(
		questRatings.length
			? (questRatings.reduce((s: number, r: any) => s + r.rating, 0) / questRatings.length).toFixed(1)
			: null
	);
	const locationOptions = $derived(
		regionOptions.find((r: any) => r.id === selectedRegionId)?.locations ?? [] as any[]
	);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/dm" class="back-link">← DM Dashboard</a>
			<h2 class="page__title">{data.quest.title}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.quest.status] ?? 'badge-muted'}">{data.quest.status.replace('_', ' ')}</span>
				{#if !data.isMainDM}<span class="badge badge-muted">Co-DM</span>{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}

	<!-- Admin rejection feedback -->
	{#if data.quest.status === 'CANCELLED' && data.quest.reviewNote}
		<div class="form-error" style="margin-bottom:1rem;">
			<p style="font-weight:600;">Quest rejected by admin.</p>
			<p style="margin-top:0.25rem; font-size:0.875rem;">Reason: {data.quest.reviewNote}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="form-success">
			{#if (form as any).action === 'details_updated'}Details updated.
		{:else if (form as any).action === 'rewards_updated'}Rewards updated.
		{:else if (form as any).action === 'submitted'}Quest submitted for admin approval.
		{:else if (form as any).action === 'approved'}Quest approved and published.
		{:else if (form as any).action === 'rejected'}Quest rejected.
			{:else if (form as any).action === 'started'}Quest started!
			{:else if (form as any).action === 'ended'}Quest ended — please submit results.
			{:else if (form as any).action === 'result_submitted'}Results submitted for admin approval.
			{:else}Done.
			{/if}
		</div>
	{/if}

	<!-- Action buttons -->
	<div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
		{#if data.quest.status === 'DRAFT'}
			<form method="post" action="?/submit" use:enhance={e_reload}>
				<button type="submit" class="btn btn-primary btn-sm">Submit for approval</button>
			</form>
		{/if}
		{#if data.quest.status === 'PENDING_APPROVAL' && canApprove}
			<form method="post" action="?/approve" use:enhance={e_reload}>
				<button type="submit" class="btn btn-primary btn-sm">Approve</button>
			</form>
			<form method="post" action="?/reject" use:enhance={e_reload} style="display:flex; gap:0.25rem; flex-wrap:wrap;">
				<input name="note" type="text" class="input" placeholder="Rejection reason" required style="width:160px;" />
				<button type="submit" class="btn btn-danger btn-sm" >Reject</button>
			</form>
		{:else if data.quest.status === 'PENDING_APPROVAL'}
			<span class="badge badge-warning">Awaiting approval</span>
		{/if}
		{#if data.quest.status === 'PUBLISHED'}
			<form method="post" action="?/start" use:enhance={e_reload}>
				<button type="submit" class="btn btn-primary btn-sm">Start quest</button>
			</form>
		{/if}
		{#if data.quest.status === 'IN_PROGRESS'}
			<form method="post" action="?/end" use:enhance={e_reload}>
				<button type="submit" class="btn btn-danger btn-sm">End quest</button>
			</form>
		{/if}
		{#if data.quest.status === 'PENDING_RESULT'}
			{#if (data.quest.result as any)?.status === 'REJECTED'}
				<div style="font-size:0.875rem; color:var(--color-danger); padding:0.375rem 0.75rem; background:color-mix(in srgb, var(--color-danger) 10%, transparent); border-radius:var(--radius-sm);">
					Result rejected: {(data.quest.result as any).reviewNote ?? 'No reason given'}
				</div>
			{/if}
			{#if (data as any).itemUsages?.filter((u: any) => u.status === 'PENDING').length > 0}
				<div style="font-size:0.875rem; color:var(--text-muted);">
					📦 {(data as any).itemUsages.filter((u: any) => u.status === 'PENDING').length} item usage(s) will be processed on approval.
				</div>
			{/if}
			{#if (form as any)?.action === 'result_submitted'}
				<div class="form-success" style="font-size:0.875rem;">Results submitted — awaiting admin approval.</div>
			{/if}
			<form method="post" action="?/submitResult" use:enhance={e_reload}>
				<button type="submit" class="btn btn-primary btn-sm">
					{(data.quest.result as any)?.status === 'REJECTED' ? 'Resubmit results' : 'Submit results'}
				</button>
			</form>
		{/if}
	</div>

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Details</h3>
			{#if isReadOnly}<p class="field-hint" style="margin-bottom:0.75rem; color:var(--color-warning);">This quest is {data.quest.status.toLowerCase()} — read only.</p>{/if}
			<form method="post" action="?/updateDetails" use:enhance={e_reload}>
				<fieldset disabled={isReadOnly} style="border:none; padding:0; margin:0;">
				<div class="fields">
					<div class="field">
						<label class="label" for="qdesc">Description <span class="optional">(optional)</span></label>
						<textarea id="qdesc" name="description" class="input" rows="3">{data.quest.description ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="missionXp">Mission XP</label>
						<input id="missionXp" name="missionXp" type="number" class="input" min="0" value={data.quest.missionXp} required />
						<p class="field-hint">Divided equally among confirmed players.</p>
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
							{#each _allWorlds as w}
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
				</fieldset>
				{#if !isReadOnly}
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save details</button>
				</div>
				{/if}
			</form>
		</div>

		<!-- Pending confirmation -->
		{#if pending.length}
			<div class="card" style="border-color:var(--border-accent);">
				<h3 class="section-title">Waitlist promotions pending confirmation ({pending.length})</h3>
				{#each pending as s}
					<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; flex-wrap:wrap">
						<span>{s.characterId}</span>
						<form method="post" action="?/confirmWaitlist" use:enhance={e_reload}>
							<input type="hidden" name="signupId" value={s.id} />
							<button type="submit" class="btn btn-primary btn-sm">Confirm</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Rewards (editable for active statuses, read-only for COMPLETED/CANCELLED) -->
	{#if ['DRAFT', 'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_RESULT', 'PENDING_RESULT_APPROVAL', 'COMPLETED', 'CANCELLED'].includes(data.quest.status)}
		<div class="card">
			<h3 class="section-title">{isReadOnly ? 'Rewards' : 'Edit rewards'}</h3>
			<form method="post" action="?/updateRewards" use:enhance={e_reload}>
				<fieldset disabled={isReadOnly} style="border:none; padding:0; margin:0;">
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
				</fieldset>
				{#if !isReadOnly}
				<div style="display:flex; justify-content:space-between; margin-top:0.5rem; flex-wrap:wrap">
					<button type="button" class="btn btn-ghost btn-sm"
						onclick={() => rewardRows = [...rewardRows, { type: 'GOLD', amount: 0 }]}>+ Add reward</button>
					<button type="submit" class="btn btn-primary btn-sm">Save rewards</button>
				</div>
				{/if}
			</form>
		</div>
	{/if}

	<!-- Per-player reward breakdown -->
	{#if data.quest.rewards.length && confirmed.length > 0}
		<div class="card">
			<h3 class="section-title">Per-player rewards ({confirmed.length} players)</h3>
			<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
				{#each data.quest.rewards.filter(r => r.type !== 'ITEM') as r}
					<div class="character-class-tag">
						<span class="badge badge-muted">{r.type}</span>
						<span><strong>{Math.max(1, Math.floor(r.amount / confirmed.length))}</strong> each</span>
						<span class="table__muted" style="font-size:0.75rem;">({r.amount.toLocaleString()} total)</span>
					</div>
				{/each}
				{#each data.quest.rewards.filter(r => r.type === 'ITEM') as r}
					<div class="character-class-tag">
						<span class="badge badge-muted">ITEM</span>
						<span>{r.itemName ?? 'Item'}</span>
						<span class="table__muted" style="font-size:0.75rem;">× 1 per player (pending marketplace)</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available players for invite (PUBLISHED quests with scheduledAt only) -->
	{#if data.quest.status === 'PUBLISHED' && (data as any).availablePlayers?.length}
		<div class="card">
			<h3 class="section-title">Available players ({(data as any).availablePlayers.length})</h3>
			<p class="field-hint" style="margin-bottom:0.75rem;">These players are available at the quest time and not yet signed up.</p>
			{#if (form as any)?.inviteSuccess}<div class="form-success" style="margin-bottom:0.75rem;">Invite sent!</div>{/if}
			<div style="display:flex; flex-direction:column; gap:0.5rem;">
				{#each (data as any).availablePlayers as char}
					<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; padding:0.625rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						<div>
							<p style="font-weight:600; font-size:0.9rem; margin:0;">{char.name}</p>
							<p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">Level {char.totalLevel ?? '?'} · {char.status}</p>
						</div>
						<form method="post" action="?/invite" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}}>
							<input type="hidden" name="characterId" value={char.id} />
							<button type="submit" class="btn btn-primary btn-sm">Send invite</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Signups -->
	<div class="card">
		<h3 class="section-title">Players ({confirmed.length}/{data.quest.maxCapacity})</h3>
		{#if confirmed.length}
			<div style="display:flex; flex-direction:column; gap:0.625rem; margin-bottom:0.75rem;">
				{#each confirmed as s}
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
			<p class="table__empty" style="margin-bottom:0.75rem;">No confirmed players yet.</p>
		{/if}

		{#if waitlist.length}
			<h4 style="font-size:0.875rem; font-weight:600; margin:0 0 0.5rem;">Waitlist ({waitlist.length})</h4>
			<div style="display:flex; flex-direction:column; gap:0.625rem;">
				{#each waitlist as s}
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
		{/if}
	</div>

	<!-- Co-DMs -->
	{#if data.isMainDM}
		<div class="card">
			<h3 class="section-title">Co-DMs</h3>
			{#each data.quest.coDMs as codm}
				<div class="table__muted" style="padding:0.25rem 0;">{codm.dmProfileId}</div>
			{:else}
				<p class="table__empty">No co-DMs.</p>
			{/each}

			{#if ['DRAFT','PUBLISHED','IN_PROGRESS'].includes(data.quest.status)}
				<form method="post" action="?/addCoDM" use:enhance={e_reload} style="margin-top:0.75rem;">
					<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap">
						<div class="field" style="flex:1;">
							<label class="label" for="coDM">Add co-DM</label>
							<select id="coDM" name="dmProfileId" class="input">
								<option value="">Select DM…</option>
								{#each data.allDMProfiles.filter((p: any) => p.id !== data.profile.id && !data.quest.coDMs.some(c => c.dmProfileId === p.id)) as p}
									<option value={p.id}>{(p as any).user?.name ?? p.userId}</option>
								{/each}
							</select>
						</div>
						<button type="submit" class="btn btn-primary btn-sm">Add</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}


	<!-- Destroyable inventory (IN_PROGRESS only) -->
	{#if data.quest.status === 'IN_PROGRESS' && (data as any).destroyableInventory?.length}
		<div class="card">
			<h3 class="section-title">Item usage</h3>
			<p class="field-hint" style="margin-bottom:0.75rem;">Mark items used during this quest. Quantities will be sent for admin approval.</p>
			{#if (form as any)?.usageSaved}
				<div class="form-success">Item usage saved.</div>
			{/if}
			<form method="post" action="?/saveItemUsages" use:enhance={e_reload}>
				<div class="table-wrap">
					<table class="table">
					<thead><tr><th>Character</th><th>Random item</th><th>Category</th><th>Available</th><th>Qty used</th></tr></thead>
					<tbody>
						{#each (data as any).destroyableInventory as inv}
							<tr>
								<td>{data.quest.signups.find((s: any) => s.characterId === inv.characterId)?.character?.name ?? inv.characterId}</td>
								<td>{inv.item?.name ?? inv.itemName}</td>
								<td class="table__muted">{inv.item?.category ?? '—'}</td>
								<td>
									{inv.availableQuantity ?? inv.quantity}
									{#if inv.pendingUsed > 0}
										<span style="font-size:0.75rem; color:var(--color-warning);">({inv.pendingUsed} saved)</span>
									{/if}
								</td>
								<td style="width:100px;">
									<input type="hidden" name="characterId" value={inv.characterId} />
									<input type="hidden" name="inventoryId" value={inv.id} />
									<input type="number" name="quantityUsed" class="input" min="0"
										max={inv.availableQuantity ?? inv.quantity}
										value={inv.pendingUsed ?? 0}
										style="width:80px;" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
</div>
				<div class="form-actions" style="margin-top:0.75rem;">
					<button type="submit" class="btn btn-primary btn-sm">Save item usage</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Submitted item usages -->
	{#if (data as any).itemUsages?.length}
		<div class="card">
			<h3 class="section-title">Item usage submissions</h3>
			<div class="table-wrap">
				<table class="table">
				<thead><tr><th>Random item</th><th>Qty</th><th>Status</th><th>Note</th></tr></thead>
				<tbody>
					{#each (data as any).itemUsages as u}
						<tr>
							<td>{u.itemName}</td>
							<td>{u.quantityUsed}</td>
							<td><span class="badge badge-{u.status === 'APPROVED' ? 'success' : u.status === 'REJECTED' ? 'danger' : 'warning'}">{u.status}</span></td>
							<td class="table__muted">{u.reviewNote ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>
	{/if}

	<!-- Player ratings for this quest -->
	{#if data.quest.status === 'COMPLETED'}
		<div class="card">
			<div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; flex-wrap:wrap">
				<h3 class="section-title" style="margin:0;">Player ratings</h3>
				{#if ratingsAvg}
					<span style="font-size:1.25rem; font-weight:700; color:var(--color-accent);">{ratingsAvg}</span>
					<span style="font-size:0.875rem; color:var(--text-muted);">({questRatings.length} rating{questRatings.length !== 1 ? 's' : ''})</span>
				{/if}
			</div>
			{#if questRatings.length}
				<div style="display:flex; flex-direction:column; gap:0.625rem;">
					{#each questRatings as r}
						<div style="padding:0.625rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-sm);">
							<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.125rem; flex-wrap:wrap">
								<span style="color:#f59e0b;">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
								<span style="font-size:0.75rem; color:var(--text-muted);">{new Date(r.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
							</div>
							{#if r.comment}
								<p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">"{r.comment}"</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="table__empty">No ratings yet.</p>
			{/if}
		</div>
	{/if}
</div>