<!-- apps/admin/src/routes/(app)/characters/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminDnd5eSheetSection from './_sheets/AdminDnd5eSheetSection.svelte';
	import { invalidateAll } from '$app/navigation';
	import { renderMarkdown } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Tabs ─────────────────────────────────────────────────────────
	type Tab = 'overview' | 'identity' | 'sheet' | 'inventory' | 'activity';
	let tab = $state<Tab>('overview');

	// ── Derived ──────────────────────────────────────────────────────
	const character  = $derived(data.character as any);
	const charSheet       = $derived((data as any).charSheet);
	const enrichedClasses = $derived(charSheet?.enrichedClasses ?? character.classes ?? []);

	// ── Edit classes state (identity tab) ───────────────────────────────────
	let editClasses = $state<{classId:string;subclassId:string;allocatedLevel:number}[]>([]);
	$effect(() => {
		const cls = (character.classes ?? []).map((c: any) => ({
			classId: c.classId, subclassId: c.subclassId ?? '', allocatedLevel: c.allocatedLevel,
		}));
		const current = editClasses;
		if (current.length === 0) editClasses = cls.length ? cls : [{classId:'',subclassId:'',allocatedLevel:1}];
	});
	const pendingChanges  = $derived((charSheet?.sheet?.pendingChanges ?? (character as any).dnd5eSheet?.pendingChanges) as any);
	const totalLevel = $derived((character as any).level ?? 0);


	// ── Helpers ──────────────────────────────────────────────────────
	const statusColors: Record<string,string> = {
		PENDING:'badge-warning', ACTIVE:'badge-success', RESTING:'badge-accent',
		SUSPENDED:'badge-danger', RETIRED:'badge-muted', DECEASED:'badge-muted',
	};
	const dangerColors: Record<string,string> = {
		Safe:'badge-success', Low:'badge-accent', Moderate:'badge-warning',
		High:'badge-danger', Extreme:'badge-danger',
	};
	const rarityColors: Record<string,string> = {
		Mundane:'badge-muted', Common:'badge-muted', Uncommon:'badge-accent',
		Rare:'badge-success', Very_Rare:'badge-warning', Legendary:'badge-danger',
		Artifact:'badge-danger', Unknown:'badge-muted',
	};

	function formatDate(d: Date|string) {
		return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
	}
</script>

<div class="page">
	<!-- ── Page header ──────────────────────────────────────────── -->
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← Characters</a>
			<h2 class="page__title">{character.name}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[character.status]??'badge-muted'}">{character.status}</span>
				{#if character.statusReason}<span class="badge badge-muted">{character.statusReason}</span>{/if}
				<span class="table__muted">Lv {totalLevel}</span>
				{#if data.owner}<span class="table__muted">· {(data.owner as any).name}</span>{/if}
			</div>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			{#if character.status === 'PENDING'}
				<form method="post" action="?/approve" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
					<button type="submit" class="btn btn-primary btn-sm">✓ Approve</button>
				</form>
				<form method="post" action="?/reject" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
					<input type="hidden" name="note" value="Rejected by admin." />
					<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕ Reject</button>
				</form>
			{/if}
			<form method="post" action="?/deleteCharacter" use:enhance={({cancel})=>{
				if(!confirm('Delete this character? This cannot be undone.')) cancel();
				return async({update})=>{await update();};
			}}>
				<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Delete</button>
			</form>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if (form as any)?.approveSuccess}<div class="form-success">Character approved.</div>{/if}
	{#if (form as any)?.rejectSuccess}<div class="form-success">Character rejected.</div>{/if}
	{#if (form as any)?.updateSuccess}<div class="form-success">Character updated.</div>{/if}
	{#if (form as any)?.classesSuccess}<div class="form-success">Classes updated.</div>{/if}
	{#if (form as any)?.statusSuccess}<div class="form-success">Status updated.</div>{/if}
	{#if (form as any)?.currencySuccess}<div class="form-success">Currency adjusted.</div>{/if}
	{#if (form as any)?.inventorySuccess}<div class="form-success">Inventory updated.</div>{/if}

	<!-- ── Pending banner ────────────────────────────────────────── -->
	{#if character.status === 'PENDING'}
		<div class="card" style="border-left:3px solid var(--color-warning); margin-bottom:1rem;">
			<div class="page__header" style="margin-bottom:0.75rem;">
				<div>
					<p style="font-weight:700; margin:0;">⏳ Pending changes</p>
					<p style="font-size:0.8125rem; color:var(--text-muted); margin:0.25rem 0 0;">{character.statusReason}</p>
				{#if character.statusReason === 'LEVEL_DOWN_PENDING'}
					<p style="font-size:0.8125rem; color:var(--color-danger); margin:0.25rem 0 0;">
						Player needs to reduce class levels to match their current XP.
					</p>
				{/if}
				</div>
				<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
					<form method="post" action="?/approve" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
						<button type="submit" class="btn btn-primary btn-sm">✓ Approve</button>
					</form>
					<form method="post" action="?/reject" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
						<input type="hidden" name="note" value="Changes rejected by admin." />
						<button type="submit" class="btn btn-ghost btn-sm">✕ Reject</button>
					</form>
				</div>
			</div>
			{#if pendingChanges}
			<div style="display:grid; gap:0.75rem; font-size:0.8125rem; margin-top:0.5rem;">
				{#if pendingChanges.speciesId}
					{@const sp = (data as any).systemData?.species?.find((s:any) => s.id === pendingChanges.speciesId)}
					{@const currentSp = (data as any).systemData?.species?.find((s:any) => s.id === charSheet?.sheet?.speciesId)}
					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<span class="table__muted">Species</span>
						<span style="color:var(--text-secondary);">{currentSp?.name ?? '—'}</span>
						<span style="color:var(--text-muted);">→</span>
						<strong style="color:var(--color-success);">{sp?.name ?? pendingChanges.speciesId}</strong>
					</div>
				{/if}
				{#if pendingChanges.backgroundId}
					{@const bg = (data as any).systemData?.backgrounds?.find((b:any) => b.id === pendingChanges.backgroundId)}
					{@const currentBg = (data as any).systemData?.backgrounds?.find((b:any) => b.id === charSheet?.sheet?.backgroundId)}
					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<span class="table__muted">Background</span>
						<span style="color:var(--text-secondary);">{currentBg?.name ?? '—'}</span>
						<span style="color:var(--text-muted);">→</span>
						<strong style="color:var(--color-success);">{bg?.name ?? pendingChanges.backgroundId}</strong>
					</div>
				{/if}
				{#if pendingChanges.classes?.length}
					<div>
						<span class="table__muted" style="display:block; margin-bottom:0.375rem;">Classes</span>
						<div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:flex-start;">
							<div>
								<p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 0.25rem;">Current</p>
								<div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
									{#each enrichedClasses as cc}
										<span class="badge badge-muted">{cc.classRef?.name ?? cc.classId} Lv{cc.allocatedLevel}{cc.subclassRef ? ` · ${cc.subclassRef.name}` : ''}</span>
									{/each}
								</div>
							</div>
							<span style="font-size:1rem; color:var(--text-muted); padding-top:1.25rem;">→</span>
							<div>
								<p style="font-size:0.75rem; color:var(--color-success); margin:0 0 0.25rem;">Proposed</p>
								<div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
									{#each pendingChanges.classes as c}
										{@const cls = (data as any).systemData?.classes?.find((cl:any) => cl.id === c.classId)}
										{@const sub = cls?.subclasses?.find((s:any) => s.id === c.subclassId)}
										<span class="badge badge-success">{cls?.name ?? c.classId} Lv{c.allocatedLevel}{sub ? ` · ${sub.name}` : ''}</span>
									{/each}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
			{/if}
		</div>
	{/if}

	<!-- ── Tabs ──────────────────────────────────────────────────── -->
	<div class="tabs" style="margin-bottom:1.5rem;">
		{#each [['overview','Overview'],['identity','Identity'],['sheet','Sheet'],['inventory','Inventory'],['activity','Activity']] as [t, label]}
			<button class="tab {tab===t?'tab--active':''}" onclick={() => tab = t as Tab}>{label}</button>
		{/each}
	</div>

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- TAB: OVERVIEW                                              -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if tab === 'overview'}
		<!-- Stats -->
		<div class="dashboard__stats" style="margin-bottom:1.5rem;">
			<div class="stat-card">
				<span class="stat-value">{character.totalXp?.toLocaleString()??0}</span>
				<span class="stat-label">XP</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{character.totalGold?.toLocaleString()??0}</span>
				<span class="stat-label">Gold</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{character.totalTokens?.toLocaleString()??0}</span>
				<span class="stat-label">Tokens</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{totalLevel}</span>
				<span class="stat-label">Level</span>
			</div>
		</div>

		<!-- Adjust currency -->
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">Adjust currency</h3>
			<form method="post" action="?/adjustCurrency" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
					<div class="field" style="margin:0; flex:1 1 100px;">
						<label class="label" for="cur-type">Type</label>
						<select id="cur-type" name="type" class="input input--select">
							<option value="XP">XP</option>
							<option value="GOLD">Gold</option>
							<option value="TOKEN">Tokens</option>
						</select>
					</div>
					<div class="field" style="margin:0; flex:1 1 100px;">
						<label class="label" for="cur-delta">Delta</label>
						<input id="cur-delta" name="delta" type="number" class="input" placeholder="±100" />
					</div>
					<div class="field" style="margin:0; flex:3 1 200px;">
						<label class="label" for="cur-note">Note</label>
						<input id="cur-note" name="note" type="text" class="input" placeholder="Reason…" required />
					</div>
					<button type="submit" class="btn btn-primary btn-sm">Adjust</button>
				</div>
			</form>
		</div>

		<!-- Status management -->
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">Status</h3>
			<form method="post" action="?/updateStatus" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
					<div class="field" style="margin:0; flex:1 1 140px;">
						<label class="label" for="status-val">Status</label>
						<select id="status-val" name="status" class="input input--select">
							{#each ['PENDING','ACTIVE','RESTING','SUSPENDED','RETIRED','DECEASED'] as s}
								<option value={s} selected={character.status === s}>{s}</option>
							{/each}
						</select>
					</div>
					<div class="field" style="margin:0; flex:3 1 200px;">
						<label class="label" for="status-note">Note <span class="optional">(optional)</span></label>
						<input id="status-note" name="note" type="text" class="input" placeholder="Reason…" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm">Update</button>
				</div>
			</form>
			{#if character.restUntil}
				<p class="field-hint" style="margin-top:0.5rem;">Resting until: {formatDate(character.restUntil)}</p>
			{/if}
		</div>

		<!-- Reject with reason -->
		{#if character.status === 'PENDING'}
			<div class="card">
				<h3 class="section-title">Reject</h3>
				<form method="post" action="?/reject" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
						<div class="field" style="margin:0; flex:1 1 200px;">
							<label class="label" for="reject-note">Reason</label>
							<input id="reject-note" name="note" type="text" class="input" required />
						</div>
						<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Reject</button>
					</div>
				</form>
			</div>
		{/if}
	{/if}

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- TAB: IDENTITY                                              -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if tab === 'identity'}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">Profile</h3>
			<form method="post" action="?/updateCharacter" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="name">Name</label>
							<input id="name" name="name" type="text" class="input" value={character.name} required />
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="species">Species</label>
							<select id="species" name="speciesId" class="input input--select">
								<option value="">— None —</option>
								{#each ((data as any).systemData?.species ?? []) as s}
									<option value={s.id} selected={(character as any).dnd5eSheet?.speciesId === s.id}>{s.name}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="bg">Background</label>
							<select id="bg" name="backgroundId" class="input input--select">
								<option value="">— None —</option>
								{#each ((data as any).systemData?.backgrounds ?? []) as b}
									<option value={b.id} selected={(character as any).dnd5eSheet?.backgroundId === b.id}>{b.name}</option>
								{/each}
							</select>
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="avatar">Avatar URL</label>
							<input id="avatar" name="avatarUrl" type="url" class="input" value={character.avatarUrl??''} />
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="portrait">Portrait URL</label>
							<input id="portrait" name="portraitUrl" type="url" class="input" value={character.portraitUrl??''} />
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="world">World lock</label>
							<select id="world" name="worldId" class="input input--select">
								<option value="">— Global —</option>
								{#each (data.allWorlds ?? []) as w}
									<option value={(w as any).id} selected={character.worldId === (w as any).id}>{(w as any).name}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:0 0 auto;">
							<div style="display:flex; align-items:center; gap:0.5rem; padding-top:1.5rem; flex-wrap:wrap">
								<input type="checkbox" name="isGlobal" value="true" checked={character.isGlobal} id="isGlobal" />
								<label for="isGlobal" class="label" style="margin:0; cursor:pointer;">Global character</label>
							</div>
						</div>
					</div>
					<div class="field">
						<label class="label" for="desc">Backstory</label>
						<textarea id="desc" name="description" class="input" rows="4">{character.description??''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary">Save profile</button>
				</div>
			</form>
		</div>

		<!-- Classes -->
		<div class="card">
			<h3 class="section-title">Classes</h3>
			<form method="post" action="?/updateClasses" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
				<div class="fields">
					{#each editClasses as ec, i}
						<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap; padding:0.5rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
							<div class="field" style="flex:2 1 160px; margin:0;">
								<label class="label" for="ec-cls-{i}">Class</label>
								<select id="ec-cls-{i}" name="classId" class="input input--select" bind:value={ec.classId}
									onchange={() => ec.subclassId = ''}>
									<option value="">Select…</option>
									{#each ((data as any).systemData?.classes ?? []) as cls}
										<option value={cls.id}>{cls.name}</option>
									{/each}
								</select>
							</div>
							<div class="field" style="flex:0 0 60px; margin:0;">
								<label class="label" for="ec-lv-{i}">Level</label>
								<input id="ec-lv-{i}" name="allocatedLevel" type="number" class="input" min="1" max="20" bind:value={ec.allocatedLevel} />
							</div>
							<div class="field" style="flex:2 1 160px; margin:0;">
								<label class="label" for="ec-sub-{i}">Subclass</label>
								{#if ec.classId}
									{@const editCls = (data as any).systemData?.classes?.find((c:any) => c.id === ec.classId)}
									{@const subs = editCls?.subclasses?.filter((s:any) => ec.allocatedLevel >= (editCls.subclassAvailableAtLevel ?? 3)) ?? []}
									{#if subs.length}
										<select id="ec-sub-{i}" name="subclassId" class="input input--select" bind:value={ec.subclassId}>
											<option value="">None</option>
											{#each subs as sub}
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
					<button type="button" class="btn btn-ghost btn-sm"
						onclick={() => editClasses = [...editClasses, {classId:'',subclassId:'',allocatedLevel:1}]}>
						+ Add class
					</button>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary">Save classes</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- TAB: SHEET                                                 -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if tab === 'sheet'}
		{#if (data as any).systemData}
			<AdminDnd5eSheetSection
				charSheet={charSheet}
				systemData={(data as any).systemData}
			/>
		{:else}
			<p class="table__empty">Game system data not available.</p>
		{/if}
	{/if}


	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- TAB: INVENTORY                                             -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if tab === 'inventory'}
		{#if data.inventory?.length}
			<div class="card">
				<div class="table-wrap">
					<table class="table">
					<thead>
						<tr>
							<th>Item</th>
							<th>Rarity</th>
							<th>Category</th>
							<th class="col-hide-mobile">Paid</th>
							<th class="col-hide-mobile">Can sell</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.inventory as inv}
							<tr>
								<td style="font-weight:600;">{(inv as any).itemName}</td>
								<td>
									{#if (inv as any).itemRarity}
										<span class="badge {rarityColors[(inv as any).itemRarity]??'badge-muted'}">
											{(inv as any).itemRarity?.replace('_',' ')}
										</span>
									{/if}
								</td>
								<td class="table__muted">{(inv as any).itemCategory ?? '—'}</td>
								<td class="table__muted col-hide-mobile">{(inv as any).purchasePrice?.toLocaleString() ?? '—'} GP</td>
								<td class="col-hide-mobile">
									<span class="badge {(inv as any).canSell ? 'badge-success' : 'badge-muted'}">
										{(inv as any).canSell ? 'Yes' : 'No'}
									</span>
								</td>
								<td>
									<form method="post" action="?/removeInventory"
										use:enhance={({cancel})=>{
											if(!confirm('Remove this item? Gold will be refunded.')) cancel();
											return async({update})=>{await update();await invalidateAll();};
										}}>
										<input type="hidden" name="inventoryId" value={(inv as any).id} />
										<input type="hidden" name="quantity" value="1" />
										<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Remove</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
</div>
			</div>
		{:else}
			<p class="table__empty">No inventory.</p>
		{/if}

		<!-- Achievements -->
		{#if (data as any).charAchievements?.length}
			<div class="card" style="margin-top:1rem;">
				<h3 class="section-title">Achievements</h3>
				<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
					{#each (data as any).charAchievements as g}
						<div style="display:flex; align-items:center; gap:0.375rem; padding:0.375rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-sm); flex-wrap:wrap" title={(g as any).achievement?.description??''}>
							<span style="font-size:1.125rem;">{(g as any).achievement?.icon??'🏆'}</span>
							<span style="font-size:0.875rem; font-weight:600;">{(g as any).achievement?.name??g.achievementId}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- TAB: ACTIVITY                                              -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if tab === 'activity'}
		{#if data.transactions?.length}
			<div class="card">
				<h3 class="section-title">Transactions</h3>
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
								<td><span class="badge badge-muted">{(tx as any).type}</span></td>
								<td>
									{#if (tx as any).delta !== null}
										<span style="font-weight:600; color:{(tx as any).delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
											{(tx as any).delta > 0 ? '+' : ''}{(tx as any).delta}
										</span>
									{:else if (tx as any).fromValue && (tx as any).toValue}
										<span class="table__muted">{(tx as any).fromValue} → {(tx as any).toValue}</span>
									{/if}
								</td>
								<td class="table__muted col-hide-mobile">{(tx as any).note ?? '—'}</td>
								<td class="table__muted">{formatDate((tx as any).createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
</div>
			</div>
		{:else}
			<p class="table__empty">No transactions.</p>
		{/if}
	{/if}
</div>