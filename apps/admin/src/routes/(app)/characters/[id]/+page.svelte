<!-- apps/admin/src/routes/(app)/characters/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const STATUSES = ['ACTIVE', 'RESTING', 'SUSPENDED', 'RETIRED', 'DECEASED', 'REJECTED'];

	const statusColors: Record<string, string> = {
		PENDING:   'badge-warning',
		ACTIVE:    'badge-success',
		RESTING:   'badge-accent',
		SUSPENDED: 'badge-danger',
		RETIRED:   'badge-muted',
		DECEASED:  'badge-muted',
		REJECTED:  'badge-danger',
	};

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const totalLevel = $derived((data.character as any).classes?.reduce((s: number, c: any) => s + c.allocatedLevel, 0) ?? 0);

	// Class editor state
	type ClassAlloc = { classId: string; subclassId: string | null; allocatedLevel: number };
	let showClassEditor = $state(false);
	let allocations     = $state<ClassAlloc[]>([]);

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
		return data.gameSystem?.classes.find((c: any) => c.id === classId)?.subclasses?.filter((s: any) => s.isAvailable) ?? [];
	}

	function enhance_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← Characters</a>
			<h2 class="page__title">{data.character.name}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.character.status] ?? 'badge-muted'}">{data.character.status}</span>
				{#if data.character.statusReason}
					<span class="badge badge-muted">{data.character.statusReason}</span>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.updateSuccess}<div class="form-success">Character updated.</div>{/if}
	{#if form?.approveSuccess}<div class="form-success">Character approved.</div>{/if}
	{#if (form as any)?.classesSuccess}<div class="form-success">Classes updated.</div>{/if}
	{#if (form as any)?.currencySuccess}<div class="form-success">Currency adjusted.</div>{/if}
	{#if form?.rejectSuccess}
		<div class="form-success">
			{(form as any).isLevelUp ? 'Level-up rejected — character reverted to Active.' : 'Character rejected.'}
		</div>
	{/if}

	<!-- Pending approval banner -->
	{#if data.character.status === 'PENDING'}
		<div class="pending-banner">
			<p>{data.character.statusReason === 'LEVEL_UP_PENDING' ? 'Level-up allocation awaiting approval.' : 'This character is awaiting approval.'}</p>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
				<form method="post" action="?/approve" use:enhance={enhance_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve</button>
				</form>
				<form method="post" action="?/reject" use:enhance={enhance_reload}>
					<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
						<input name="note" type="text" class="input" placeholder="Reason" required style="width:220px;" />
						<button type="submit" class="btn btn-danger btn-sm">
							{data.character.statusReason === 'LEVEL_UP_PENDING' ? 'Reject level-up' : 'Reject'}
						</button>
					</div>
				</form>
			</div>
			<p style="font-size:0.8125rem; color:var(--text-muted); margin-top:0.5rem;">
				{data.character.statusReason === 'LEVEL_UP_PENDING'
					? 'Rejecting will revert the character to Active.'
					: 'Rejecting sets status to Rejected. Use Delete to permanently remove.'}
			</p>
		</div>
	{/if}

	<div class="sections">
		<!-- Character summary -->
		<div class="card">
			<h3 class="section-title">Summary</h3>
			<div style="display:flex; gap:1.25rem; align-items:flex-start; flex-wrap:wrap;">
				{#if data.character.avatarUrl}
					<img src={data.character.avatarUrl} alt=""
						style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--border-accent); flex-shrink:0;" />
				{/if}
				<div class="fields" style="flex:1; min-width:200px;">
					<div class="field">
						<span class="label">Owner</span>
						<a href="/users/{data.owner?.id}" class="table__muted">{data.owner?.name ?? data.character.userId}</a>
					</div>
					<div class="field">
						<span class="label">Game System</span>
						<span class="table__muted">{data.gameSystem?.name ?? data.character.gameSystemId}</span>
					</div>
					<div class="field">
						<span class="label">Total Level</span>
						<strong>{totalLevel}</strong>
					</div>
					<div class="field">
						<span class="label">XP / Gold / Tokens</span>
						<span class="table__muted">{data.character.totalXp.toLocaleString()} XP · {data.character.totalGold.toLocaleString()} GP · {data.character.totalTokens.toLocaleString()} T</span>
					</div>
					{#if data.character.restUntil}
						<div class="field">
							<span class="label">Resting until</span>
							<span class="table__muted">{formatDate(data.character.restUntil)}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Edit details -->
		<div class="card">
			<h3 class="section-title">Edit details</h3>
			{#if form?.statusSuccess}<div class="form-success">Saved.</div>{/if}
			<form method="post" action="?/updateCharacter" use:enhance={enhance_reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Name</label>
						<input id="name" name="name" type="text" class="input" value={data.character.name} required />
					</div>
					{#if data.gameSystem?.species?.length}
						<div class="field">
							<label class="label" for="speciesId">Species <span class="optional">(optional)</span></label>
							<select id="speciesId" name="speciesId" class="input input--select">
								<option value="">None</option>
								{#each data.gameSystem.species.filter(s => s.isAvailable) as sp}
									<option value={sp.id} selected={(data.character as any).speciesId === sp.id}>{sp.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<div class="field">
						<label class="label" for="avatarUrl">Avatar URL <span class="optional">(optional)</span></label>
						{#if data.character.avatarUrl}
							<img src={data.character.avatarUrl} alt="" class="avatar-preview" style="margin-bottom:0.5rem;" />
						{/if}
						<input id="avatarUrl" name="avatarUrl" type="url" class="input" value={data.character.avatarUrl ?? ''} placeholder="https://..." />
					</div>
					<div class="field">
						<label class="label" for="portraitUrl">Portrait URL <span class="optional">(optional)</span></label>
						<input id="portraitUrl" name="portraitUrl" type="url" class="input" value={data.character.portraitUrl ?? ''} placeholder="https://..." />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save details</button>
				</div>
			</form>
		</div>

		<!-- Status -->
		<div class="card">
			<h3 class="section-title">Status</h3>
			{#if form?.statusSuccess}<div class="form-success">Status updated.</div>{/if}
			<form method="post" action="?/updateStatus" use:enhance={enhance_reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="status">Status</label>
						<select id="status" name="status" class="input input--select">
							{#each STATUSES as s}
								<option value={s} selected={data.character.status === s}>{s}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="note">Note <span class="optional">(optional)</span></label>
						<input id="note" name="note" type="text" class="input" placeholder="Reason for change" />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Update status</button>
				</div>
			</form>
		</div>
	</div>

	<!-- Class allocation (admin edit) -->
	{#if data.gameSystem}
		<div class="card">
			<div class="page__header" style="margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0">Classes</h3>
				<button class="btn btn-ghost btn-sm" onclick={() => showClassEditor = !showClassEditor}>
					{showClassEditor ? 'Cancel' : 'Edit classes'}
				</button>
			</div>

			{#if (data.character as any).classes?.length && !showClassEditor}
				<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
					{#each (data.character as any).classes as cc}
						<div class="character-class-tag">
							<span>{cc.classRef?.name ?? cc.classId}</span>
							{#if cc.subclassRef}<span class="table__muted">· {cc.subclassRef.name}</span>{/if}
							<span class="badge badge-accent">Lv {cc.allocatedLevel}</span>
						</div>
					{/each}
				</div>
			{:else if !showClassEditor}
				<p class="table__empty">No classes allocated.</p>
			{/if}

			{#if showClassEditor}
				<form method="post" action="?/updateClasses"
					use:enhance={() => { return async ({ update }) => { showClassEditor = false; await update(); await invalidateAll(); }; }}>
					<input type="hidden" name="classes" value={JSON.stringify(allocations)} />

					<div class="class-alloc-list">
						{#each allocations as alloc, i}
							<div class="class-alloc-row">
								<div class="field" style="flex:2; min-width:130px;">
									<label class="label" for="acls-{i}">Class</label>
									<select id="acls-{i}" class="input" bind:value={alloc.classId}
										onchange={() => { alloc.subclassId = null; }}>
										<option value="">Select…</option>
										{#each (data.gameSystem?.classes ?? []).filter((c: any) => c.isAvailable) as cls}
											<option value={cls.id}>{cls.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:2; min-width:130px;">
									<label class="label" for="asub-{i}">Subclass <span class="optional">(opt)</span></label>
									<select id="asub-{i}" class="input" bind:value={alloc.subclassId}>
										<option value={null}>None</option>
										{#each getSubclasses(alloc.classId) as sub}
											<option value={sub.id}>{sub.name}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:1; min-width:70px;">
									<label class="label" for="alv-{i}">Levels</label>
									<input id="alv-{i}" type="number" class="input"
										bind:value={alloc.allocatedLevel} min="1" max="20" />
								</div>
								<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
									onclick={() => removeClass(i)} aria-label="Remove">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
					<div style="display:flex; align-items:center; gap:1rem; margin-top:0.5rem; flex-wrap:wrap;">
						<button type="button" class="btn btn-ghost btn-sm" onclick={addClass}>+ Add class</button>
						<span class="table__muted" style="font-size:0.8125rem;">Total: <strong>{allocTotal}</strong></span>
						<div class="form-actions" style="margin:0; margin-left:auto;">
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => showClassEditor = false}>Cancel</button>
							<button type="submit" class="btn btn-primary btn-sm"
								disabled={allocTotal < 1 || allocations.some(a => !a.classId)}>
								Save classes
							</button>
						</div>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Transaction history -->
	<div class="card">
		<h3 class="section-title">Transaction history</h3>
		{#if data.transactions.length}
			<table class="table">
				<thead>
					<tr><th>Type</th><th>Change</th><th class="col-hide-mobile">Source</th><th class="col-hide-mobile">Note</th><th>Date</th></tr>
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
							<td class="table__muted col-hide-mobile">{tx.sourceType}</td>
							<td class="table__muted col-hide-mobile">{tx.note ?? '—'}</td>
							<td class="table__muted">{formatDate(tx.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="table__empty">No transactions yet.</p>
		{/if}
	</div>

	<!-- Currency adjustment -->
	<div class="card">
		<h3 class="section-title">Adjust XP / Gold / Tokens</h3>
		<p class="field-hint" style="margin-bottom:1rem;">All adjustments are audited and recorded as transactions. Use positive delta to add, negative to subtract.</p>
		<form method="post" action="?/adjustCurrency" use:enhance={enhance_reload}>
			<div class="fields" style="flex-direction:row; align-items:flex-end; flex-wrap:wrap;">
				<div class="field" style="min-width:120px; flex:1;">
					<label class="label" for="curr-type">Type</label>
					<select id="curr-type" name="type" class="input input--select">
						<option value="XP">XP</option>
						<option value="GOLD">Gold</option>
						<option value="TOKEN">Tokens</option>
					</select>
				</div>
				<div class="field" style="min-width:120px; flex:1;">
					<label class="label" for="curr-delta">Delta</label>
					<input id="curr-delta" name="delta" type="number" class="input" placeholder="+100 or -50" required />
				</div>
				<div class="field" style="min-width:200px; flex:3;">
					<label class="label" for="curr-note">Note (required)</label>
					<input id="curr-note" name="note" type="text" class="input" placeholder="Reason for adjustment" required />
				</div>
				<button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end; margin-bottom:0.125rem;">Apply</button>
			</div>
			<div style="display:flex; gap:1.5rem; font-size:0.875rem; color:var(--text-muted); margin-top:0.75rem;">
				<span>XP: <strong style="color:var(--text-primary);">{data.character.totalXp.toLocaleString()}</strong></span>
				<span>Gold: <strong style="color:var(--text-primary);">{data.character.totalGold.toLocaleString()}</strong></span>
				<span>Tokens: <strong style="color:var(--text-primary);">{data.character.totalTokens.toLocaleString()}</strong></span>
			</div>
		</form>
	</div>

	<!-- Danger zone -->
	<div class="card" style="border-color: var(--color-danger);">
		<h3 class="section-title" style="color:var(--color-danger);">Danger zone</h3>
		<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
			Permanently deletes this character and all associated data. This cannot be undone.
		</p>
		<form method="post" action="?/deleteCharacter" use:enhance>
			<button type="submit" class="btn btn-danger btn-sm"
				onclick={(e) => { if (!confirm(`Permanently delete "${data.character.name}"? This cannot be undone.`)) e.preventDefault(); }}>
				Delete character permanently
			</button>
		</form>
	</div>
</div>