<!-- apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.svelte -->
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
			: [{ type: 'GOLD', amount: 0 }];
	});

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
	const regionOptions   = $derived((selectedWorld?.regions ?? []) as any[]);
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
		{#if data.quest.status === 'PENDING_RESULT' && !data.quest.result}
			<form method="post" action="?/submitResult" use:enhance={e_reload}>
				<button type="submit" class="btn btn-primary btn-sm">Submit results</button>
			</form>
		{/if}
	</div>

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/updateDetails" use:enhance={e_reload}>
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
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save details</button>
				</div>
			</form>
		</div>

		<!-- Pending confirmation -->
		{#if pending.length}
			<div class="card" style="border-color:var(--border-accent);">
				<h3 class="section-title">Waitlist promotions pending confirmation ({pending.length})</h3>
				{#each pending as s}
					<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0;">
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

	<!-- Edit rewards (DRAFT / PENDING_APPROVAL only) -->
	{#if ['DRAFT', 'PENDING_APPROVAL'].includes(data.quest.status)}
		<div class="card">
			<h3 class="section-title">Edit rewards</h3>
			<form method="post" action="?/updateRewards" use:enhance={e_reload}>
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
				<div style="display:flex; justify-content:space-between; margin-top:0.5rem;">
					<button type="button" class="btn btn-ghost btn-sm"
						onclick={() => rewardRows = [...rewardRows, { type: 'GOLD', amount: 0 }]}>+ Add reward</button>
					<button type="submit" class="btn btn-primary btn-sm">Save rewards</button>
				</div>
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
					<div style="display:flex; gap:0.5rem; align-items:flex-end;">
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
</div>