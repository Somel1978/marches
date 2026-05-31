<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const char           = $derived((data as any).character);
	const canManage      = $derived((data as any).canManage === true);
	const pending        = $derived(char.pendingChanges as any ?? null);
	const systemData     = $derived((data as any).systemData as any);
	const isPending      = $derived(char.status === 'PENDING');
	const isEditPending  = $derived(char.statusReason === 'EDIT_PENDING');
	const needsReview    = $derived(isPending || isEditPending);

	const totalLevel = $derived(
		(char.classes ?? []).reduce((s: number, c: any) => s + c.allocatedLevel, 0)
	);

	// Helpers to resolve names from systemData
	function speciesName(id: string | null) {
		if (!id) return '—';
		return systemData?.species?.find((s: any) => s.id === id)?.name ?? id;
	}
	function backgroundName(id: string | null) {
		if (!id) return '—';
		return systemData?.backgrounds?.find((b: any) => b.id === id)?.name ?? id;
	}
	function className(id: string) {
		return systemData?.classes?.find((c: any) => c.id === id)?.name ?? id;
	}
	function subclassName(classId: string, subId: string | null) {
		if (!subId) return null;
		const cls = systemData?.classes?.find((c: any) => c.id === classId);
		return cls?.subclasses?.find((s: any) => s.id === subId)?.name ?? subId;
	}

	// Check if a field changed (for highlighting)
	function changed(field: string) {
		return pending && pending[field] !== undefined && pending[field] !== (char as any)[field];
	}

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
	<a href="/dm/worlds/{char.worldId}/characters" class="back-link">← Characters</a>
	{#if (data as any).owner}
		<span class="table__muted" style="font-size:0.875rem;">Player: {(data as any).owner.name}</span>
	{/if}
</div>

{#if form?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if (form as any)?.approveSuccess}<div class="form-success">Character approved.</div>{/if}
{#if (form as any)?.rejectSuccess}<div class="form-success">Character rejected.</div>{/if}

<!-- Approval banner -->
{#if needsReview && canManage}
	<div class="card" style="margin-bottom:1.5rem; border-color:var(--color-warning); background:color-mix(in srgb, var(--color-warning) 8%, transparent);">
		<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
			<div>
				<strong>{isEditPending ? 'Edit pending review' : 'New character pending approval'}</strong>
				{#if isEditPending}
					<p class="field-hint" style="margin-top:0.25rem;">Changes are highlighted below. Approve to apply, reject to discard.</p>
				{/if}
			</div>
			<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
				<form method="post" action="?/approve" use:enhance={e_reload}>
					<button type="submit" class="btn btn-primary btn-sm">Approve</button>
				</form>
				<form method="post" action="?/reject" use:enhance={e_reload} style="display:flex; gap:0.25rem; flex-wrap:wrap">
					<input name="note" type="text" class="input" placeholder="Rejection reason" required style="width:180px;" />
					<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Reject</button>
				</form>
			</div>
		</div>
	</div>
{:else if needsReview}
	<div class="card" style="margin-bottom:1.5rem; border-color:var(--color-warning);">
		<span class="badge badge-warning">{isEditPending ? 'Edit pending approval' : 'Pending approval'}</span>
		<span class="field-hint" style="margin-left:0.5rem;">Awaiting admin or world DM review.</span>
	</div>
{/if}

<div class="sections">
	<!-- Character overview -->
	<div class="card">
		<div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; margin-bottom:1rem;">
			{#if char.avatarUrl}
				<img src={char.avatarUrl} alt={char.name} style="width:72px; height:72px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
			{/if}
			<div>
				<h3 style="margin:0; font-size:1.25rem;">{char.name}</h3>
				<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.25rem;">
					<span class="badge badge-accent">Level {totalLevel}</span>
					<span class="badge badge-muted">{char.status}</span>
				</div>
			</div>
		</div>

		<div class="fields" style="margin-bottom:0;">
			<!-- Species -->
			<div class="field" style={changed('speciesId') ? 'background:color-mix(in srgb, var(--color-warning) 12%, transparent); border-radius:var(--radius-sm); padding:0.5rem;' : ''}>
				<span class="label">Species</span>
				{#if changed('speciesId')}
					<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap">
						<span class="table__muted" style="text-decoration:line-through;">{speciesName(char.speciesId)}</span>
						<span style="color:var(--color-warning);">→</span>
						<strong style="color:var(--color-warning);">{speciesName(pending.speciesId)}</strong>
					</div>
				{:else}
					<span>{speciesName(char.speciesId)}</span>
				{/if}
			</div>

			<!-- Background -->
			<div class="field" style={changed('backgroundId') ? 'background:color-mix(in srgb, var(--color-warning) 12%, transparent); border-radius:var(--radius-sm); padding:0.5rem;' : ''}>
				<span class="label">Background</span>
				{#if changed('backgroundId')}
					<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap">
						<span class="table__muted" style="text-decoration:line-through;">{backgroundName(char.backgroundId)}</span>
						<span style="color:var(--color-warning);">→</span>
						<strong style="color:var(--color-warning);">{backgroundName(pending.backgroundId)}</strong>
					</div>
				{:else}
					<span>{backgroundName(char.backgroundId)}</span>
				{/if}
			</div>

			<!-- Classes -->
			<div class="field" style={pending?.classes ? 'background:color-mix(in srgb, var(--color-warning) 12%, transparent); border-radius:var(--radius-sm); padding:0.5rem;' : ''}>
				<span class="label">Classes</span>
				{#if pending?.classes}
					<!-- Show current crossed out, proposed highlighted -->
					<div style="margin-bottom:0.25rem;">
						<span class="table__muted" style="font-size:0.8rem; text-decoration:line-through;">
							{(char.classes ?? []).map((c: any) => `${className(c.classId)} ${c.allocatedLevel}`).join(', ')}
						</span>
					</div>
					<div>
						{#each pending.classes as c}
							{@const sub = subclassName(c.classId, c.subclassId)}
							<span class="badge badge-warning" style="margin-right:0.25rem;">
								{className(c.classId)} {c.allocatedLevel}{sub ? ` (${sub})` : ''}
							</span>
						{/each}
					</div>
				{:else}
					<div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
						{#each char.classes ?? [] as c}
							{@const sub = subclassName(c.classId, c.subclassId)}
							<span class="badge badge-muted">
								{className(c.classId)} {c.allocatedLevel}{sub ? ` (${sub})` : ''}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Description -->
			{#if char.description || pending?.description}
				<div class="field" style={changed('description') ? 'background:color-mix(in srgb, var(--color-warning) 12%, transparent); border-radius:var(--radius-sm); padding:0.5rem;' : ''}>
					<span class="label">Description / Backstory</span>
					{#if changed('description')}
						<p class="table__muted" style="text-decoration:line-through; font-size:0.875rem; margin:0 0 0.25rem;">{char.description}</p>
						<p style="font-size:0.875rem; color:var(--color-warning); margin:0;">{pending.description}</p>
					{:else}
						<p style="font-size:0.875rem; color:var(--text-secondary); margin:0; white-space:pre-wrap;">{char.description ?? '—'}</p>
					{/if}
				</div>
			{/if}

			<!-- Currency -->
			<div class="field">
				<span class="label">Resources</span>
				<div style="display:flex; gap:1rem; flex-wrap:wrap;">
					<span class="table__muted">{char.totalGold?.toLocaleString() ?? 0} GP</span>
					<span class="table__muted">{char.totalXp?.toLocaleString() ?? 0} XP</span>
					<span class="table__muted">{char.totalTokens?.toLocaleString() ?? 0} Tokens</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Inventory (read-only) -->
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

	<!-- Character sheet — Species, Background & Features -->
	{#if char.speciesRef || char.backgroundRef}
		<div class="card">
			<h3 class="section-title">Character sheet</h3>
			{#if char.speciesRef}
				{@const sp = char.speciesRef}
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
			{#if char.backgroundRef}
				{@const bg = char.backgroundRef}
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
			{#each char.classes ?? [] as cc}
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
</div>