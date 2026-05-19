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
	const availableLevel = $derived(totalLevel); // In future: calculated from XP threshold

	function openLightbox(src: string) { lightboxSrc = src; lightboxOpen = true; }

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// Class allocation state
	type ClassAlloc = { classId: string; subclassId: string | null; allocatedLevel: number };

	let allocations = $state<ClassAlloc[]>([]);

	$effect.pre(() => {
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
		return data.gameSystem?.classes.find((c: any) => c.id === classId)?.subclasses ?? [];
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← My Characters</a>
			<h2 class="page__title">{data.character.name}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.character.status] ?? 'badge-muted'}">{data.character.status}</span>
				<span class="table__muted">Level {totalLevel}</span>
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.updateSuccess}<div class="form-success">Character updated.</div>{/if}
	{#if form?.levelUpSuccess}<div class="form-success">Class allocation submitted — awaiting admin approval.</div>{/if}
	{#if form?.retireSuccess}<div class="form-success">Character retired.</div>{/if}

	{#if data.character.status === 'PENDING'}
		<div class="pending-banner">
			This character is awaiting admin approval.
		</div>
	{/if}

	{#if data.character.statusReason === 'LEVEL_UP_PENDING'}
		<div class="pending-banner">
			Level-up available — allocate your new levels below and submit for approval.
		</div>
	{/if}

	<div class="sections">
		<!-- Portrait + stats -->
		<div class="card">
			{#if data.character.portraitUrl || data.character.avatarUrl}
				<div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
					{#if data.character.portraitUrl}
						<button class="avatar-preview-btn" onclick={() => openLightbox(data.character.portraitUrl!)} aria-label="View portrait">
							<img src={data.character.portraitUrl} alt="" class="character-portrait" />
						</button>
					{/if}
					{#if data.character.avatarUrl}
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
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>

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

	<!-- Class allocation -->
	{#if data.character.status !== 'DECEASED' && data.character.status !== 'RETIRED' && data.gameSystem}
		<div class="card">
			<div class="page__header" style="margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0">Class allocation</h3>
				{#if data.character.status === 'ACTIVE' || data.character.statusReason === 'LEVEL_UP_PENDING'}
					<button class="btn btn-ghost btn-sm" onclick={() => showClasses = !showClasses}>
						{showClasses ? 'Cancel' : 'Edit classes'}
					</button>
				{/if}
			</div>

			{#if (data.character as any).classes?.length && !showClasses}
				<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
					{#each (data.character as any).classes as cc}
						<div class="character-class-tag">
							<span>{(cc as any).classRef?.name ?? cc.classId}</span>
							{#if (cc as any).subclassRef}<span class="table__muted">· {(cc as any).subclassRef.name}</span>{/if}
							<span class="badge badge-accent">Lv {cc.allocatedLevel}</span>
						</div>
					{/each}
				</div>
			{:else if !showClasses}
				<p class="table__empty">No classes allocated yet.</p>
			{/if}

			{#if showClasses}
				<form method="post" action="?/submitLevelUp"
					use:enhance={() => {
						return async ({ update }) => { showClasses = false; await update(); await invalidateAll(); };
					}}>
					<input type="hidden" name="classes" value={JSON.stringify(allocations)} />

					<div class="class-alloc-list">
						{#each allocations as alloc, i}
							<div class="class-alloc-row">
								<div class="field" style="flex:2; min-width:140px;">
									<label class="label" for="class-{i}">Class</label>
									<select id="class-{i}" class="input" bind:value={alloc.classId}
										onchange={() => { alloc.subclassId = null; }}>
										<option value="">Select class…</option>
										{#each (data.gameSystem?.classes ?? []).filter((c: any) => c.isAvailable) as cls}
											<option value={cls.id}>{cls.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:2; min-width:140px;">
									<label class="label" for="subclass-{i}">Subclass <span class="optional">(optional)</span></label>
									<select id="subclass-{i}" class="input" bind:value={alloc.subclassId}>
										<option value={null}>None</option>
										{#each getSubclasses(alloc.classId).filter((s: any) => s.isAvailable) as sub}
											<option value={sub.id}>{sub.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:1; min-width:80px;">
									<label class="label" for="level-{i}">Levels</label>
									<input id="level-{i}" type="number" class="input"
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
						<div style="display:flex; align-items:center; gap:0.75rem;">
							<button type="button" class="btn btn-ghost btn-sm" onclick={addClass}>+ Add class</button>
							<span class="table__muted" style="font-size:0.8125rem;">Total allocated: <strong>{allocTotal}</strong></span>
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
		</div>
	{/if}

	<!-- Recent transactions -->
	{#if data.transactions.length}
		<div class="card">
			<h3 class="section-title">Recent activity</h3>
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