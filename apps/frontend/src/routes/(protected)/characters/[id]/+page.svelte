<!-- apps/frontend/src/routes/(protected)/characters/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving        = $state(false);
	let lightboxOpen  = $state(false);
	let lightboxSrc   = $state('');
	let showClasses   = $state(false);

	const statusColors: Record<string, string> = {
		PENDING:   'badge-warning',
		ACTIVE:    'badge-success',
		RESTING:   'badge-accent',
		SUSPENDED: 'badge-danger',
		RETIRED:   'badge-muted',
		DECEASED:  'badge-muted',
	};

	const totalLevel     = $derived((data.character as any).classes?.reduce((s: number, c: any) => s + c.allocatedLevel, 0) ?? 0);
	const availableLevel = $derived(
		((data as any).progressionThresholds?.length)
			? (data as any).progressionThresholds.filter((t: any) => data.character.totalXp >= t.xpRequired).length
			: totalLevel
	);

	function openLightbox(src: string) { lightboxSrc = src; lightboxOpen = true; }

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	type ClassAlloc = { classId: string; subclassId: string | null; allocatedLevel: number };
	let allocations = $state<ClassAlloc[]>([]);
	let editClasses = $state<{classId:string;subclassId:string;allocatedLevel:number}[]>([]);

	$effect.pre(() => {
		const cls = ((data.character as any).classes ?? []).map((c: any) => ({ classId: c.classId, subclassId: c.subclassId ?? '', allocatedLevel: c.allocatedLevel }));
		editClasses = cls.length ? cls : [{classId:'',subclassId:'',allocatedLevel:1}];
		allocations = ((data.character as any).classes ?? []).map((c: any) => ({
			classId:        c.classId,
			subclassId:     c.subclassId ?? null,
			allocatedLevel: c.allocatedLevel,
		}));
	});

	const allocTotal = $derived(allocations.reduce((s, a) => s + (a.allocatedLevel || 0), 0));

	function addClass() {
		allocations = [...allocations, { classId: '', subclassId: null, allocatedLevel: 1 }];
	}
	function removeClass(i: number) {
		allocations = allocations.filter((_, idx) => idx !== i);
	}
	function getSubclasses(classId: string) {
		return data.systemData?.classes.find((c: any) => c.id === classId)?.subclasses ?? [];
	}

	const rarityColors: Record<string, string> = {
		Mundane:   'badge-muted', Common:    'badge-muted',
		Uncommon:  'badge-accent', Rare:     'badge-success',
		Very_Rare: 'badge-warning', Legendary:'badge-danger',
		Artifact:  'badge-danger', Unknown:  'badge-muted',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← My Characters</a>
			<h2 class="page__title">{data.character.name}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.character.status] ?? 'badge-muted'}">{data.character.status}</span>
				<span class="table__muted">Level {totalLevel}</span>
				{#if (data.character as any).isGlobal === false && (data.character as any).worldId}
					<span class="badge badge-accent" title="This character is locked to a specific world">🌍 {(data as any).worldName ?? 'World-specific'}</span>
				{:else}
					<span class="badge badge-muted" title="This character can join quests in any world">🌐 Global</span>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.updateSuccess}<div class="form-success">Character updated.</div>{/if}
	{#if (form as any)?.resubmitSuccess}<div class="form-success">Character resubmitted for approval.</div>{/if}
	{#if form?.levelUpSuccess}<div class="form-success">Class allocation submitted — awaiting admin approval.</div>{/if}
	{#if form?.retireSuccess}<div class="form-success">Character retired.</div>{/if}

	{#if data.character.status === 'PENDING'}
		<div class="pending-banner">
			This character is awaiting admin approval.
		</div>
	{/if}
	{#if data.character.status === 'REJECTED'}
		<div class="pending-banner" style="border-color:var(--color-danger);">
			❌ Your character was rejected. Update the details below and resubmit for approval.
		</div>
	{/if}

	{#if data.character.statusReason === 'LEVEL_UP_PENDING'}
		<div class="pending-banner">
			Level-up available — allocate your new levels below and submit for approval.
		</div>
	{/if}
	{#if data.character.statusReason === 'LEVEL_DOWN_PENDING'}
		<div class="pending-banner" style="border-color:var(--color-danger);">
			⬇ Level adjustment required — your XP decreased. Reduce your class levels to {availableLevel} and submit for approval.
		</div>
	{/if}

	<div class="sections">
		<!-- Portrait + stats -->
		<div class="card">
			{#if data.character.portraitUrl || data.character.avatarUrl}
				<div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; align-items:flex-end;">
					{#if data.character.portraitUrl}
						<button class="avatar-preview-btn" style="width:auto; height:auto; border-radius:var(--radius-md);" onclick={() => openLightbox(data.character.portraitUrl!)} aria-label="View portrait">
							<img src={data.character.portraitUrl} alt="" class="character-portrait" />
						</button>
					{/if}
					{#if data.character.avatarUrl && data.character.avatarUrl !== data.character.portraitUrl}
						<button class="avatar-preview-btn" onclick={() => openLightbox(data.character.avatarUrl!)} aria-label="View avatar">
							<img src={data.character.avatarUrl} alt="" class="avatar-preview" />
						</button>
					{/if}
				</div>
			{/if}

			<div class="dashboard__stats">
				<div class="stat-card">
					<span class="stat-value">{data.character.totalXp.toLocaleString()}</span>
					<span class="stat-label">XP</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{data.character.totalGold.toLocaleString()}</span>
					<span class="stat-label">Gold</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{data.character.totalTokens.toLocaleString()}</span>
					<span class="stat-label">Tokens</span>
				</div>
				<div class="stat-card">
					<span class="stat-value">{totalLevel}</span>
					<span class="stat-label">Level</span>
				</div>
			</div>
		</div>

		<!-- Edit character details -->
		<div class="card">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/update" use:enhance={() => {
				saving = true;
				return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Name</label>
						<input id="name" name="name" type="text" class="input" value={data.character.name} required />
					</div>
					<div class="field">
						<label class="label" for="avatarUrl">Avatar URL <span class="optional">(optional)</span></label>
						<input id="avatarUrl" name="avatarUrl" type="url" class="input" value={data.character.avatarUrl ?? ''} placeholder="https://..." />
					</div>
					<div class="field">
						<label class="label" for="portraitUrl">Portrait URL <span class="optional">(optional)</span></label>
						<input id="portraitUrl" name="portraitUrl" type="url" class="input" value={data.character.portraitUrl ?? ''} placeholder="https://..." />
					</div>
					<div class="field">
						<label class="label" for="description">Backstory <span class="optional">(optional)</span></label>
						<textarea id="description" name="description" class="input" rows="5">{(data.character as any).description ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>

			{#if data.character.status === 'REJECTED'}
				<hr class="divider" />
				<form method="post" action="?/resubmit" use:enhance={() => {
					return async ({ update }) => { await update(); await invalidateAll(); };
				}}>
					<button type="submit" class="btn btn-primary btn-sm">↺ Resubmit for approval</button>
				</form>
			{/if}
			{#if data.character.status === 'ACTIVE' || data.character.status === 'RESTING'}
				<hr class="divider" />
				<form method="post" action="?/retire"
					use:enhance={({ cancel }) => { if (!confirm('Retire this character? This cannot be undone.')) { cancel(); return; } return async ({ update }) => { await update(); await invalidateAll(); }; }}>
					<button type="submit" class="btn btn-ghost btn-sm">
						Retire character
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- XP Progression indicator -->
	{#if data.gameSystem && (data as any).progressionThresholds?.length}
		{@const thresholds = (data as any).progressionThresholds}
		{@const currentThreshold = thresholds.filter((t: any) => data.character.totalXp >= t.xpRequired).at(-1)}
		{@const nextThreshold = thresholds.find((t: any) => t.xpRequired > data.character.totalXp)}
		<div class="card" style="margin-bottom:1rem;">
			<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
				<span style="font-size:0.875rem; font-weight:600;">
					Progression: Level {totalLevel}
					{#if data.character.statusReason === 'LEVEL_UP_PENDING'}
						<span class="badge badge-warning" style="margin-left:0.5rem;">Level up available!</span>
					{/if}
				</span>
				<span style="font-size:0.8125rem; color:var(--text-muted);">
					{data.character.totalXp.toLocaleString()} XP
					{#if nextThreshold} · Next level at {nextThreshold.xpRequired.toLocaleString()} XP{/if}
				</span>
			</div>
			{#if nextThreshold}
				{@const prevXp = currentThreshold?.xpRequired ?? 0}
				{@const progress = Math.min(100, Math.round(((data.character.totalXp - prevXp) / (nextThreshold.xpRequired - prevXp)) * 100))}
				<div style="height:6px; background:var(--bg-overlay); border-radius:99px; overflow:hidden;">
					<div style="height:100%; width:{progress}%; background:var(--accent-light); border-radius:99px; transition:width 0.3s ease;"></div>
				</div>
				<p style="font-size:0.75rem; color:var(--text-muted); margin:0.375rem 0 0; text-align:right;">{progress}%</p>
			{:else}
				<p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">Max level reached.</p>
			{/if}
		</div>
	{/if}

	<!-- Pending changes notice -->
	{#if data.character.status === 'PENDING' && (data.character as any).statusReason === 'EDIT_PENDING'}
		<div class="card" style="border-left:3px solid var(--color-warning);">
			<p style="margin:0; font-size:0.875rem;">⏳ Your character edits are pending admin approval.</p>
		</div>
	{/if}

	<!-- Species, Background & Classes — structural edit OR level-up allocation -->
	{#if ['ACTIVE','RESTING','REJECTED'].includes(data.character.status) || data.character.statusReason === 'LEVEL_UP_PENDING' || data.character.statusReason === 'LEVEL_DOWN_PENDING'}
		<div class="card">
			{#if data.character.statusReason === 'LEVEL_DOWN_PENDING'}
				<!-- Level-down: reduce class levels -->
				<div class="page__header" style="margin-bottom:1rem;">
					<h3 class="section-title" style="margin:0">Adjust classes</h3>
					<span class="badge badge-danger">Remove {(data.character as any).classes?.reduce((s:number,c:any)=>s+c.allocatedLevel,0) - availableLevel} level{(data.character as any).classes?.reduce((s:number,c:any)=>s+c.allocatedLevel,0) - availableLevel !== 1 ? 's' : ''}</span>
				</div>
				<p class="field-hint" style="margin-bottom:0.75rem; color:var(--color-danger);">
					Reduce total levels to {availableLevel}. Changes require admin approval.
				</p>
				<form method="post" action="?/submitLevelUp"
					use:enhance={() => {
						return async ({ update }) => { showClasses = false; await update(); await invalidateAll(); };
					}}>
					<div class="class-alloc-list">
						{#each allocations as alloc, i}
							<div class="class-alloc-row">
								<div class="field" style="flex:2; min-width:140px;">
									<label class="label" for="dn-class-{i}">Class</label>
									<select id="dn-class-{i}" name="classId" class="input" bind:value={alloc.classId}
										onchange={() => { alloc.subclassId = null; }}>
										<option value="">Select class…</option>
										{#each (data.systemData?.classes ?? []).filter((c: any) => c.isAvailable) as cls}
											<option value={cls.id}>{cls.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:1; min-width:80px;">
									<label class="label" for="dn-level-{i}">Levels</label>
									<input id="dn-level-{i}" name="allocatedLevel" type="number" class="input"
										bind:value={alloc.allocatedLevel} min="0" max="20" />
								</div>
								<input type="hidden" name="subclassId" value={alloc.subclassId ?? ''} />
								{#if allocations.length > 1}
									<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
										onclick={() => removeClass(i)} aria-label="Remove class">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
					<div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.75rem; flex-wrap:wrap; gap:0.5rem;">
						<span class="table__muted" style="font-size:0.8125rem;">
							Total: <strong class="{allocTotal > availableLevel ? 'form-error' : allocTotal === availableLevel ? '' : 'form-error'}">{allocTotal}</strong> / {availableLevel} allowed
						</span>
						<div class="form-actions" style="margin:0;">
							<button type="submit" class="btn btn-primary btn-sm"
								disabled={allocTotal !== availableLevel || allocations.some(a => !a.classId)}>
								Submit for approval
							</button>
						</div>
					</div>
				</form>

			{:else if data.character.statusReason === 'LEVEL_UP_PENDING'}
				<!-- Level-up: allocate class levels -->
				<div class="page__header" style="margin-bottom:1rem;">
					<h3 class="section-title" style="margin:0">Classes</h3>
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showClasses = !showClasses}>
						{showClasses ? 'Cancel' : 'Allocate levels'}
					</button>
				</div>
				{#if !showClasses}
					{#if (data.character as any).classes?.length}
						<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
							{#each (data.character as any).classes as cc}
								<div class="character-class-tag">
									<span>{(cc as any).classRef?.name ?? cc.classId}</span>
									{#if (cc as any).subclassRef}<span class="table__muted">· {(cc as any).subclassRef.name}</span>{/if}
									<span class="badge badge-accent">Lv {cc.allocatedLevel}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="table__empty">No classes allocated yet.</p>
					{/if}
				{/if}
				{#if showClasses}
					<form method="post" action="?/submitLevelUp"
						use:enhance={() => {
							return async ({ update }) => { showClasses = false; await update(); await invalidateAll(); };
						}}>
						<div class="class-alloc-list">
							{#each allocations as alloc, i}
								<div class="class-alloc-row">
									<div class="field" style="flex:2; min-width:140px;">
										<label class="label" for="class-{i}">Class</label>
										<select id="class-{i}" name="classId" class="input" bind:value={alloc.classId}
											onchange={() => { alloc.subclassId = null; }}>
											<option value="">Select class…</option>
											{#each (data.systemData?.classes ?? []).filter((c: any) => c.isAvailable) as cls}
												<option value={cls.id}>{cls.name}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:2; min-width:140px;">
										<label class="label" for="subclass-{i}">Subclass <span class="optional">(optional)</span></label>
										<select id="subclass-{i}" name="subclassId" class="input" bind:value={alloc.subclassId}>
											<option value={null}>None</option>
											{#each getSubclasses(alloc.classId).filter((s: any) => s.isAvailable) as sub}
												<option value={sub.id}>{sub.name}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:1; min-width:80px;">
										<label class="label" for="level-{i}">Levels</label>
										<input id="level-{i}" name="allocatedLevel" type="number" class="input"
											bind:value={alloc.allocatedLevel} min="1" max="20" />
									</div>
									<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
										onclick={() => removeClass(i)} aria-label="Remove class">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
										</svg>
									</button>
								</div>
							{/each}
						</div>
						<div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.75rem; flex-wrap:wrap; gap:0.5rem;">
							<div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap">
								<button type="button" class="btn btn-ghost btn-sm" onclick={addClass}>+ Add class</button>
								<span class="table__muted" style="font-size:0.8125rem;">
									Allocated: <strong>{allocTotal}</strong>
									{#if availableLevel > allocTotal}
										<span style="color:var(--accent-light);">/ {availableLevel} available</span>
									{:else}
										/ {availableLevel} available
									{/if}
								</span>
							</div>
							<div class="form-actions" style="margin:0;">
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => showClasses = false}>Cancel</button>
								<button type="submit" class="btn btn-primary btn-sm" disabled={allocTotal < 1 || allocations.some(a => !a.classId)}>
									Submit for approval
								</button>
							</div>
						</div>
					</form>
				{/if}

			{:else}
				<!-- ACTIVE/RESTING/REJECTED: structural edit with read-only default -->
				<div class="page__header" style="margin-bottom:1rem;">
					<h3 class="section-title" style="margin:0">Species, Background & Classes</h3>
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showClasses = !showClasses}>
						{showClasses ? 'Cancel' : 'Edit'}
					</button>
				</div>
				{#if (form as any)?.changesSubmitted}
					<div class="form-success" style="margin-bottom:0.75rem;">Changes submitted for approval.</div>
				{/if}
				{#if !showClasses}
					<div style="display:flex; flex-direction:column; gap:0.375rem; font-size:0.875rem;">
						{#if (data.character as any).speciesRef}
							<div><span class="table__muted">Species:</span> <strong>{(data.character as any).speciesRef.name}</strong></div>
						{/if}
						{#if (data.character as any).backgroundRef}
							<div><span class="table__muted">Background:</span> <strong>{(data.character as any).backgroundRef.name}</strong></div>
						{/if}
						{#if (data.character as any).classes?.length}
							<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.25rem;">
								{#each (data.character as any).classes as cc}
									<div class="character-class-tag">
										<span>{(cc as any).classRef?.name ?? cc.classId}</span>
										{#if (cc as any).subclassRef}<span class="table__muted">· {(cc as any).subclassRef.name}</span>{/if}
										<span class="badge badge-accent">Lv {cc.allocatedLevel}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
				{#if showClasses}
					<p class="field-hint" style="margin-bottom:0.75rem;">Changes require admin approval.</p>
					<form method="post" action="?/submitChanges" use:enhance>
						<div class="fields">
							<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
								<div class="field" style="flex:1 1 200px;">
									<label class="label" for="speciesId">Species</label>
									<select id="speciesId" name="speciesId" class="input input--select">
										<option value="">Select species…</option>
										{#each ((data as any).systemData?.species ?? []).filter((s:any) => s.isAvailable) as s}
											<option value={s.id} selected={(data.character as any).speciesId === s.id}>{s.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:1 1 200px;">
									<label class="label" for="backgroundId">Background</label>
									<select id="backgroundId" name="backgroundId" class="input input--select">
										<option value="">Select background…</option>
										{#each ((data as any).systemData?.backgrounds ?? []).filter((b:any) => b.isAvailable) as b}
											<option value={b.id} selected={(data.character as any).backgroundId === b.id}>{b.name}</option>
										{/each}
									</select>
								</div>
							</div>
							{#each editClasses as ec, i}
								<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap; padding:0.5rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
									<div class="field" style="flex:2 1 160px; margin:0;">
										<label class="label" for="ec-class-{i}">Class</label>
										<select id="ec-class-{i}" name="classId" class="input input--select" bind:value={ec.classId}
											onchange={() => ec.subclassId = ''}>
											<option value="">Select…</option>
											{#each ((data as any).systemData?.classes ?? []).filter((c:any) => c.isAvailable) as cls}
												<option value={cls.id}>{cls.name}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:0 0 60px; margin:0;">
										<label class="label" for="ec-level-{i}">Level</label>
										<input id="ec-level-{i}" name="allocatedLevel" type="number" class="input" min="1" max="20" bind:value={ec.allocatedLevel} />
									</div>
									<div class="field" style="flex:2 1 160px; margin:0;">
										<label class="label" for="ec-sub-{i}">Subclass</label>
										{#if ec.classId}
											{@const editCls = (data as any).systemData?.classes?.find((c:any) => c.id === ec.classId)}
											{@const editSubclasses = editCls?.subclasses?.filter((s:any) => s.isAvailable && ec.allocatedLevel >= (editCls.subclassAvailableAtLevel ?? 3)) ?? []}
											{#if editSubclasses.length}
												<select id="ec-sub-{i}" name="subclassId" class="input input--select" bind:value={ec.subclassId}>
													<option value="">None</option>
													{#each editSubclasses as sub}
														<option value={sub.id}>{sub.name}</option>
													{/each}
												</select>
											{:else}
												<input type="hidden" name="subclassId" value="" />
												<p class="field-hint" style="margin:0; padding:0.5rem 0; font-size:0.75rem;">
													{editCls ? `Available at level ${editCls.subclassAvailableAtLevel ?? 3}` : '—'}
												</p>
											{/if}
										{:else}
											<input type="hidden" name="subclassId" value="" />
										{/if}
									</div>
									{#if editClasses.length > 1}
										<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
											onclick={() => editClasses = editClasses.filter((_,idx) => idx !== i)}>✕</button>
									{/if}
								</div>
							{/each}
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => editClasses = [...editClasses, {classId:'',subclassId:'',allocatedLevel:1}]}>
								+ Add class
							</button>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn btn-primary">Submit for approval</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Character sheet — Species, Background & Features -->
	{#if (data.character as any).speciesRef || (data.character as any).backgroundRef}
		<div class="card">
			<h3 class="section-title">Character sheet</h3>
			{#if (data.character as any).speciesRef}
					{@const sp = (data.character as any).speciesRef}
					<details class="sheet-class">
						<summary>
							<span>{sp.name}</span>
							{#if sp.isSubrace}<span class="badge badge-muted">Subrace</span>{/if}
							{#if sp.isLegacy}<span class="badge badge-warning">Legacy</span>{/if}
							{#if sp.traits?.length}<span class="sheet-class__count">{sp.traits.length} traits</span>{/if}
						</summary>
						{#if sp.description}<p class="sheet-panel__desc" style="margin:0.5rem 0;">{sp.description}</p>{/if}
						{#if sp.traits?.length}
							<div class="sheet-features">
								{#each sp.traits as trait}
									<div class="sheet-feature">
										<div class="sheet-feature__name">
											{#if trait.requiredLevel}<span class="badge badge-muted">Lv {trait.requiredLevel}</span>{/if}
											<span>{trait.name}</span>
										</div>
										{#if trait.description}<p class="sheet-feature__desc">{trait.description}</p>{/if}
									</div>
								{/each}
							</div>
						{/if}
					</details>
				{/if}
			{#if (data.character as any).backgroundRef}
				{@const bg = (data.character as any).backgroundRef}
				<details class="sheet-class">
					<summary>
						<span>{bg.name}</span>
						{#if bg.featureName}<span class="badge badge-accent">{bg.featureName}</span>{/if}
					</summary>
					{#if bg.shortDescription}<p class="sheet-panel__desc" style="margin:0.5rem 0;">{bg.shortDescription}</p>{/if}
					<div class="sheet-panel__meta" style="margin-top:0.25rem;">
						{#if bg.skillProficiencies}<div><span>Skills:</span> {bg.skillProficiencies}</div>{/if}
						{#if bg.toolProficiencies}<div><span>Tools:</span> {bg.toolProficiencies}</div>{/if}
						{#if bg.languages}<div><span>Languages:</span> {bg.languages}</div>{/if}
					</div>
				</details>
			{/if}
			{#each (data.character as any).classes ?? [] as cc}
				{#if cc.classRef && (cc.classFeatures?.length || cc.subclassFeatures?.length)}
					<details class="sheet-class">
						<summary>
							<span>{cc.classRef.name}</span>
							<span class="badge badge-muted">Lv {cc.allocatedLevel}</span>
							{#if cc.subclassRef}<span class="badge badge-accent">{cc.subclassRef.name}</span>{/if}
							<span class="sheet-class__count">{(cc.classFeatures?.length ?? 0) + (cc.subclassFeatures?.length ?? 0)} features</span>
						</summary>
						<div class="sheet-features">
							{#each [...(cc.classFeatures ?? []), ...(cc.subclassFeatures ?? [])].sort((a,b) => a.requiredLevel - b.requiredLevel) as feat}
								<div class="sheet-feature">
									<div class="sheet-feature__name">
										<span class="badge badge-muted">Lv {feat.requiredLevel}</span>
										<span>{feat.name}</span>
									</div>
									{#if feat.description}<p class="sheet-feature__desc">{feat.description}</p>{/if}
								</div>
							{/each}
						</div>
					</details>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Backstory -->
	<div class="card">
		<h3 class="section-title">Backstory</h3>
		<form method="post" action="?/update" use:enhance={() => {
			return async ({ update }) => { await update(); await invalidateAll(); };
		}}>
			<div class="field">
				<textarea name="description" class="input" rows="5"
					placeholder="Write your character's backstory here…">{(data.character as any).description ?? ''}</textarea>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary btn-sm">Save backstory</button>
			</div>
		</form>
	</div>

	<!-- Inventory -->
	<div class="card">
		<div class="page__header" style="margin-bottom:1rem;">
			<h3 class="section-title" style="margin:0;">Inventory ({((data as any).inventory ?? []).length})</h3>
		</div>
		{#if (form as any)?.sellSuccess}<div class="form-success">Sell request submitted — awaiting admin approval.</div>{/if}
		{#if (form as any)?.cancelSuccess}<div class="form-success">Request cancelled.</div>{/if}
		{#if ((data as any).inventory ?? []).length}
			<div style="display:flex; flex-direction:column; gap:0.75rem;">
				{#each ((data as any).inventory ?? []) as inv}
					<div style="display:flex; align-items:center; gap:1rem; padding:0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md); flex-wrap:wrap;">
						{#if inv.imageUrl}
							<img src={inv.imageUrl} alt="" style="width:40px; height:40px; object-fit:contain; border-radius:var(--radius-sm); flex-shrink:0;" />
						{/if}
						<div style="flex:1; min-width:0;">
							<p style="font-weight:600; font-size:0.9375rem; margin:0;">
								{#if (inv as any).itemLink}
									<a href={(inv as any).itemLink} target="_blank" rel="noopener noreferrer"
										style="color:inherit; text-decoration:underline; text-underline-offset:2px;">{inv.itemName}</a>
								{:else}
									{inv.itemName}
								{/if}
							</p>
							<div style="display:flex; gap:0.375rem; flex-wrap:wrap; margin-top:0.25rem;">
								{#if inv.liveRarity ?? inv.itemRarity}
									<span class="badge {(rarityColors as any)[inv.liveRarity ?? inv.itemRarity ?? ''] ?? 'badge-muted'}">
										{(inv.liveRarity ?? inv.itemRarity ?? '').replace('_', ' ')}
									</span>
								{/if}
								{#if inv.itemCategory}<span class="badge badge-muted">{inv.itemCategory}</span>{/if}
								<span class="badge badge-muted">×{inv.quantity}</span>
							</div>
							<p style="font-size:0.8125rem; color:var(--text-muted); margin:0.25rem 0 0;">
								Paid: {inv.purchasePrice?.toLocaleString() ?? '—'} GP
								{#if inv.livePrice !== null && inv.sourceType === 'PURCHASE' && inv.livePrice !== inv.purchasePrice} · Live: {inv.livePrice.toLocaleString()} GP{/if}
							</p>
						</div>
						{#if inv.itemId && !((data as any).pendingSells ?? []).some((t: any) => t.itemId === inv.itemId)}
							<form method="post" action="?/sell" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}}>
								<input type="hidden" name="inventoryId" value={inv.id} />
								{#if inv.canSell === false}
									<input type="hidden" name="quantity" value="1" />
									<span class="badge badge-muted" title="Granted as reward — cannot be sold">Not sellable</span>
								{:else}
									<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
										{#if inv.quantity > 1}
											<input type="number" name="quantity" class="input" min="1" max={inv.quantity}
												value="1" style="width:60px; padding:0.25rem 0.5rem; font-size:0.8rem;" />
										{:else}
											<input type="hidden" name="quantity" value="1" />
										{/if}
										<button type="submit" class="btn btn-ghost btn-sm">
											Sell ({inv.effectiveSellPrice !== null && inv.effectiveSellPrice !== undefined ? inv.effectiveSellPrice.toLocaleString() : inv.livePrice !== null ? Math.floor(inv.livePrice * 0.5).toLocaleString() : '?'} GP ea)
										</button>
									</div>
								{/if}
							</form>
						{:else if ((data as any).pendingSells ?? []).some((t: any) => t.itemId === inv.itemId)}
							{@const pendingSell = ((data as any).pendingSells ?? []).find((t: any) => t.itemId === inv.itemId)}
							<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
								<span class="badge badge-warning">Sell pending</span>
								{#if pendingSell}
									<form method="post" action="?/cancel" use:enhance={() => {
										return async ({ update }) => { await update(); await invalidateAll(); };
									}}>
										<input type="hidden" name="txId" value={pendingSell.id} />
										<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
											onclick={(e) => { if (!confirm('Cancel this sell request?')) e.preventDefault(); }}>
											Cancel
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="table__empty">No items in inventory.</p>
		{/if}
	</div>

	<!-- Recent activity -->
	{#if data.transactions.length}
		<div class="card">
			<h3 class="section-title">Recent activity</h3>
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>Type</th>
						<th>Change</th>
						<th class="col-hide-mobile">Note</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{#each data.transactions as tx}
						<tr>
							<td><span class="badge badge-muted">{tx.type}</span></td>
							<td>
								{#if tx.delta !== null}
									<span style="font-weight:600; color:{tx.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'}">{tx.delta > 0 ? '+' : ''}{tx.delta}</span>
								{:else if tx.fromValue && tx.toValue}
									<span class="table__muted">{tx.fromValue} → {tx.toValue}</span>
								{/if}
							</td>
							<td class="table__muted col-hide-mobile">{tx.note ?? '—'}</td>
							<td class="table__muted">{formatDate(tx.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>
	{/if}

	<!-- Pending purchases -->
	{#if ((data as any).pendingBuys ?? []).length}
		<div class="card">
			<h3 class="section-title">Pending purchases ({((data as any).pendingBuys ?? []).length})</h3>
			<p class="field-hint" style="margin-bottom:0.75rem;">Gold is reserved. Admin approval required to receive items.</p>
			<div style="display:flex; flex-direction:column; gap:0.5rem;">
				{#each ((data as any).pendingBuys ?? []) as tx}
					<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; padding:0.625rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						<div>
							<p style="font-weight:600; font-size:0.9rem; margin:0;">{tx.item.name} ×{tx.quantity}</p>
							<p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">{tx.totalPrice.toLocaleString()} GP reserved</p>
						</div>
						<form method="post" action="?/cancel" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
							<input type="hidden" name="txId" value={tx.id} />
							<button type="submit" class="btn btn-ghost btn-sm">Cancel &amp; refund</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Achievements -->
	{#if (data as any).charAchievements?.length}
		<div class="card">
			<h3 class="section-title">Achievements</h3>
			<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
				{#each (data as any).charAchievements as g}
					<div style="display:flex; align-items:center; gap:0.375rem; padding:0.375rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-sm); border:1px solid var(--border-muted); flex-wrap:wrap" title={g.note ?? g.achievement?.description ?? ''}>
						<span style="font-size:1.125rem;">{g.achievement?.icon ?? '🏆'}</span>
						<span style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">{g.achievement?.name ?? g.achievementId}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Lightbox -->
{#if lightboxOpen}
	<div class="lightbox" role="dialog" aria-modal="true" aria-label="Image preview">
		<button class="lightbox__backdrop" onclick={() => lightboxOpen = false} aria-label="Close"></button>
		<div class="lightbox__card card">
			<button class="lightbox__close btn btn-ghost btn-sm btn-icon" onclick={() => lightboxOpen = false} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
			<img src={lightboxSrc} alt="" class="lightbox__image" />
		</div>
	</div>
{/if}