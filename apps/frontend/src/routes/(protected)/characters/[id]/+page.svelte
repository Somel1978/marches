<!-- apps/frontend/src/routes/(protected)/characters/[id]/+page.svelte -->
<script lang="ts">
	import { rarityBadge, rarityLabel } from '$lib/rarity';
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import MoodEditor from '@core/ui/gamesystems/dnd5e/MoodEditor.svelte';
	import Dnd5eSheetSection from './_sheets/Dnd5eSheetSection.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Universal derived ────────────────────────────────────────────────────
	const slug        = $derived((data.gameSystem as any)?.slug ?? '');
	const isDnd5e     = $derived(slug === 'dnd5e');
	const totalLevel  = $derived((data.character as any).level ?? 0);
	const thresholds  = $derived((data as any).progressionThresholds ?? []);
	// Maintained server-side by the progression path — never recomputed here.
	const earnedLevel = $derived((data.character as any).earnedLevel ?? 0);
	const isMilestone = $derived((data.character as any).progressionMode === 'MILESTONE');
	const progressUnit  = $derived(isMilestone ? 'credits' : 'XP');
	const progressTotal = $derived(
		isMilestone ? ((data.character as any).totalMilestones ?? 0) : data.character.totalXp,
	);
	const required = (t: any) => (isMilestone ? t.milestoneRequired : t.xpRequired);
	// Sum XP/Gold that came from token store boosts
	const boostTxs  = $derived((data as any).boostTxs ?? []);
	const boostXp   = $derived((boostTxs as any[]).filter((t: any) => t.type === 'XP'   && (t.delta ?? 0) > 0).reduce((s: number, t: any) => s + t.delta, 0));
	const boostGold = $derived((boostTxs as any[]).filter((t: any) => t.type === 'GOLD' && (t.delta ?? 0) > 0).reduce((s: number, t: any) => s + t.delta, 0));
	const isLevelUp   = $derived(data.character.statusReason === 'LEVEL_UP_PENDING');
	const isLevelDown = $derived(data.character.statusReason === 'LEVEL_DOWN_PENDING');
	const canEdit     = $derived(['ACTIVE','RESTING','REJECTED'].includes(data.character.status) || isLevelUp || isLevelDown);

	let saving       = $state(false);
	let lightboxOpen = $state(false);
	let lightboxSrc  = $state('');

	const statusColors: Record<string, string> = {
		PENDING:'badge-warning', ACTIVE:'badge-success', RESTING:'badge-accent',
		SUSPENDED:'badge-danger', RETIRED:'badge-muted', DECEASED:'badge-muted',
	};

	function openLightbox(src: string) { lightboxSrc = src; lightboxOpen = true; }
	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
	}



	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<svelte:head><title>{data.character.name} — Marches</title></svelte:head>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← My Characters</a>
			<h2 class="page__title">{data.character.name}</h2>
			<div class="page__title-row">
				<span class="badge {statusColors[data.character.status] ?? 'badge-muted'}">{data.character.status}</span>
				<span class="table__muted">Level {totalLevel}</span>
				{#if (data.character as any).isGlobal === false && (data.character as any).worldId}
					<span class="badge badge-accent">🌍 {(data as any).worldName ?? 'World-specific'}</span>
				{:else}
					<span class="badge badge-muted">🌐 Global</span>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.updateSuccess}<div class="form-success">Character updated.</div>{/if}
	{#if (form as any)?.resubmitSuccess}<div class="form-success">Character resubmitted for approval.</div>{/if}
	{#if (form as any)?.levelUpSuccess}<div class="form-success">Class allocation submitted — awaiting admin approval.</div>{/if}
	{#if (form as any)?.backstorySuccess}<div class="form-success">Backstory saved.</div>{/if}

	<!-- Status banners -->
	{#if data.character.status === 'PENDING' && !isLevelUp && !isLevelDown}
		<div class="pending-banner">⏳ This character is awaiting admin approval.</div>
	{/if}
	{#if data.character.status === 'REJECTED'}
		<div class="pending-banner" style="border-color:var(--color-danger);">❌ Your character was rejected. Update the details below and resubmit for approval.</div>
	{/if}
	{#if isLevelUp}
		<div class="pending-banner">⬆ Level up! You have earned <strong>Level {earnedLevel}</strong>. Allocate your classes below to total exactly {earnedLevel} and submit for approval.</div>
	{/if}
	{#if isLevelDown}
		<div class="pending-banner" style="border-color:var(--color-danger);">⬇ Level adjustment required — reduce class levels to {earnedLevel}.</div>
	{/if}

	<!-- Portrait + Stats -->
	<div class="card">
		{#if data.character.portraitUrl || data.character.avatarUrl}
			<div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; align-items:flex-end;">
				{#if data.character.portraitUrl}
					<button class="avatar-preview-btn" style="width:auto;height:auto;border-radius:var(--radius-md);" onclick={() => openLightbox(data.character.portraitUrl!)} aria-label="View portrait">
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
				{#if boostXp > 0}<span style="font-size:0.625rem;color:var(--color-accent);display:block;">+{boostXp.toLocaleString()} from boosts</span>{/if}
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.character.totalGold.toLocaleString()}</span>
				<span class="stat-label">Gold</span>
				{#if boostGold > 0}<span style="font-size:0.625rem;color:var(--color-accent);display:block;">+{boostGold.toLocaleString()} from boosts</span>{/if}
			</div>
			<div class="stat-card"><span class="stat-value">{data.character.totalTokens.toLocaleString()}</span><span class="stat-label">Tokens</span></div>
			{#if isMilestone}
				<div class="stat-card"><span class="stat-value">{progressTotal.toLocaleString()}</span><span class="stat-label">Milestones</span></div>
			{/if}
			<div class="stat-card"><span class="stat-value">{totalLevel}</span><span class="stat-label">Level</span></div>
		</div>
	</div>

	<!-- Details -->
	<div class="card">
		<h3 class="section-title">Details</h3>
		<form method="post" action="?/update" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update({ reset: false }); };
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
					<div class="field">
						<label class="label" for="isPrivate">Public profile</label>
						<select id="isPrivate" name="isPrivate" class="input input--select">
							<option value="false" selected={!(data.character as any).isPrivate}>🌐 Visible — show full character card</option>
							<option value="true"  selected={(data.character as any).isPrivate}>🔒 Private — show name and portrait only</option>
						</select>
					</div>
					<div style="margin-top:0.25rem;">
						<a href="/characters/public/{data.character.id}" class="btn btn-ghost btn-sm" target="_blank">👁 View public profile</a>
					</div>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
			</div>
		</form>
		{#if data.character.status === 'REJECTED'}
			<hr class="divider" />
			<form method="post" action="?/resubmit" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
				<button type="submit" class="btn btn-primary btn-sm">↺ Resubmit for approval</button>
			</form>
		{/if}
		{#if data.character.status === 'ACTIVE' || data.character.status === 'RESTING'}
			<hr class="divider" />
			<form method="post" action="?/retire" use:enhance={({ cancel }) => {
				askConfirm('Confirm', 'Retire this character? This cannot be undone.', () => { cancel(); }); return;
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
				<button type="submit" class="btn btn-ghost btn-sm">Retire character</button>
			</form>
		{/if}
	</div>

	<!-- ── Character Mood — universal, not dnd5e specific ──────────── -->
	{#if canEdit || (data.character as any).moodEmoji || (data.character as any).moodText}
		<div class="card">
			<h3 class="section-title" style="margin-bottom:0.75rem;">Character Mood</h3>
			<MoodEditor
				emoji={(data.character as any).moodEmoji ?? ''}
				text={(data.character as any).moodText ?? ''}
				readonly={!canEdit}
				onSave={async (emoji, text) => {
					const fd = new FormData();
					fd.set('emoji', emoji);
					fd.set('text', text);
					await fetch('?/saveMood', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
				}}
			/>
		</div>
	{/if}

	<!-- Progression bar -->
	{#if thresholds.length}
		{@const nextThreshold    = thresholds[totalLevel] ?? null}
		{@const currentThreshold = totalLevel > 0 ? thresholds[totalLevel - 1] : null}
		<div class="card">
			<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
				<span style="font-size:0.875rem; font-weight:600;">
					Progression: Level {totalLevel}
					{#if earnedLevel > totalLevel}<span class="badge badge-warning" style="margin-left:0.5rem;">Level {earnedLevel} available!</span>{/if}
				</span>
				<span style="font-size:0.8125rem; color:var(--text-muted);">
					{progressTotal.toLocaleString()} {progressUnit}{#if nextThreshold} · Next at {required(nextThreshold).toLocaleString()} {progressUnit}{/if}
				</span>
			</div>
			{#if nextThreshold}
				{@const prev     = currentThreshold ? required(currentThreshold) : 0}
				{@const span     = Math.max(1, required(nextThreshold) - prev)}
				{@const progress = Math.min(100, Math.max(0, Math.round(((progressTotal - prev) / span) * 100)))}
				<div style="height:6px; background:var(--bg-overlay); border-radius:99px; overflow:hidden;">
					<div style="height:100%; width:{progress}%; background:var(--accent-light); border-radius:99px; transition:width 0.3s ease;"></div>
				</div>
				<p style="font-size:0.75rem; color:var(--text-muted); margin:0.375rem 0 0; text-align:right;">{progress}%</p>
			{:else}
				<p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">Max level reached.</p>
			{/if}
		</div>
	{/if}

	<!-- Game system sheet — system-specific component handles all sheet content -->
	{#if isDnd5e}
		<Dnd5eSheetSection
			charSheet={(data as any).charSheet}
			systemData={(data as any).systemData}
			scoreAudit={(data as any).scoreAudit ?? []}
			spellbooks={(data as any).spellbooks ?? []}
			character={data.character}
			{canEdit}
			canViewDescriptions={(data as any).canViewDescriptions ?? false}
			{isLevelUp}
			{isLevelDown}
			availableLevel={earnedLevel}
		/>
	{:else if data.gameSystem}
		<div class="card">
			<p class="table__empty">Character sheet not yet available for {(data.gameSystem as any).name}.</p>
		</div>
	{/if}

	<!-- Backstory -->
	<div class="card">
		<h3 class="section-title">Backstory</h3>
		<form method="post" action="?/saveBackstory" use:enhance={() => {
			return async ({ update }) => { await update({ reset: false }); };
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
						{#if inv.imageUrl}<img src={inv.imageUrl} alt="" style="width:40px;height:40px;object-fit:contain;border-radius:var(--radius-sm);flex-shrink:0;" />{/if}
						<div style="flex:1; min-width:0;">
							<p style="font-weight:600; font-size:0.9375rem; margin:0;">
								{#if (inv as any).itemLink}
									<a href={(inv as any).itemLink} target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">{inv.itemName}</a>
								{:else}{inv.itemName}{/if}
							</p>
							<div style="display:flex; gap:0.375rem; flex-wrap:wrap; margin-top:0.25rem;">
								{#if inv.liveRarity ?? inv.itemRarity}<span class="badge {rarityBadge(inv.liveRarity ?? inv.itemRarity)}">{rarityLabel(inv.liveRarity ?? inv.itemRarity)}</span>{/if}
								{#if inv.itemCategory}<span class="badge badge-muted">{inv.itemCategory}</span>{/if}
								<span class="badge badge-muted">×{inv.quantity}</span>
							</div>
							<p style="font-size:0.8125rem; color:var(--text-muted); margin:0.25rem 0 0;">Paid: {inv.purchasePrice?.toLocaleString() ?? '—'} GP</p>
						</div>
						{#if inv.itemId && !((data as any).pendingSells ?? []).some((t: any) => t.itemId === inv.itemId)}
							<form method="post" action="?/sell" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
								<input type="hidden" name="inventoryId" value={inv.id} />
								{#if inv.canSell === false}
									<input type="hidden" name="quantity" value="1" />
									<span class="badge badge-muted">Not sellable</span>
								{:else}
									<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
										{#if inv.quantity > 1}<input type="number" name="quantity" class="input" min="1" max={inv.quantity} value="1" style="width:60px;padding:0.25rem 0.5rem;font-size:0.8rem;" />
										{:else}<input type="hidden" name="quantity" value="1" />{/if}
										<button type="submit" class="btn btn-ghost btn-sm">
											Sell ({inv.effectiveSellPrice !== null && inv.effectiveSellPrice !== undefined ? inv.effectiveSellPrice.toLocaleString() : inv.livePrice !== null ? Math.floor(inv.livePrice * 0.5).toLocaleString() : '?'} GP ea)
										</button>
									</div>
								{/if}
							</form>
						{:else if ((data as any).pendingSells ?? []).some((t: any) => t.itemId === inv.itemId)}
							{@const ps = ((data as any).pendingSells ?? []).find((t: any) => t.itemId === inv.itemId)}
							<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
								<span class="badge badge-warning">Sell pending</span>
								{#if ps}
									<form method="post" action="?/cancel" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="txId" value={ps.id} />
										<button type="submit" class="btn btn-danger btn-sm"  onclick={(ev) => askConfirm('Confirm', 'Cancel this sell request?', () => { (ev.currentTarget as HTMLElement)?.closest('form')?.requestSubmit(); })}>Cancel</button>
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
					<thead><tr><th>Type</th><th>Change</th><th class="col-hide-mobile">Note</th><th>Date</th></tr></thead>
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
								<td class="table__muted col-hide-mobile">{tx.note ?? '—'}{#if (tx as any).worldName}<span class="badge badge-muted" style="margin-left:0.375rem;font-size:0.6875rem;">{(tx as any).worldName}</span>{/if}</td>
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
						<form method="post" action="?/cancel" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
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
						<span style="font-size:0.875rem; font-weight:600;">{g.achievement?.name ?? g.achievementId}</span>
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
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>