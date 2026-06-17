<!-- apps/admin/src/routes/(app)/marketplace/items/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	const rarityColors: Record<string, string> = {
		Mundane:   'badge-muted',
		Common:    'badge-muted',
		Uncommon:  'badge-accent',
		Rare:      'badge-success',
		Very_Rare: 'badge-warning',
		Legendary: 'badge-danger',
		Artifact:  'badge-danger',
		Unknown:   'badge-muted',
	};

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/marketplace/items" class="back-link">← Items</a>
			<h2 class="page__title">{data.item.name}</h2>
			<div class="page__title-row">
				<span class="badge {rarityColors[data.item.rarity] ?? 'badge-muted'}">{data.item.rarity.replace('_', ' ')}</span>
				<span class="badge badge-muted">{data.item.category}</span>
				{#if data.item.requiresAttunement}<span class="badge badge-warning">Attunement</span>{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Item updated.</div>{/if}

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Details</h3>
			<div class="fields" style="margin-bottom:0;">
				<div class="field"><span class="label">Base item</span><span class="table__muted">{data.item.baseItem}</span></div>
				<div class="field"><span class="label">Weight</span><span class="table__muted">{data.item.weight ?? '—'} lbs</span></div>
				<div class="field"><span class="label">Source</span><span class="table__muted">{data.item.source ?? '—'}</span></div>
				{#if data.item.requirements}<div class="field"><span class="label">Requirements</span><span class="table__muted">{data.item.requirements}</span></div>{/if}
{#if data.item.description}<div class="field"><span class="label">Description</span><p style="font-size:0.875rem; color:var(--text-secondary); margin:0; white-space:pre-wrap;">{data.item.description}</p></div>{/if}
				{#if data.item.link}<div class="field"><span class="label">Link</span><a href={data.item.link} target="_blank" class="table__muted" style="font-size:0.875rem;">D&D Beyond ↗</a></div>{/if}
			</div>
		</div>

		<div class="card" style="max-width:400px;">
			<h3 class="section-title">Availability & Pricing</h3>
			<form method="post" use:enhance={() => {
				saving = true;
				return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="buyPrice">Buy price (GP)</label>
						<input id="buyPrice" name="buyPrice" type="number" class="input" min="0" step="0.01" value={data.item.buyPrice} required />
					</div>
					<div class="field">
						<label class="label" for="stock">Stock <span class="optional">(blank = unlimited)</span></label>
						<input id="stock" name="stock" type="number" class="input" min="0" value={data.item.stock ?? ''} placeholder="Unlimited" />
					</div>
					<div class="field field--inline">
						<label class="label" for="isAvailable">Available to players</label>
						<select id="isAvailable" name="isAvailable" class="input input--select">
							<option value="true"  selected={data.item.isAvailable}>Yes</option>
							<option value="false" selected={!data.item.isAvailable}>No</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</div>
	</div>
	<!-- Danger zone -->
	<div class="card" style="border-color:var(--color-danger); margin-top:1.5rem; max-width:400px;">
		<h3 class="section-title" style="color:var(--color-danger);">Danger zone</h3>
		<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">Permanently removes this item from the catalogue. Cannot be undone.</p>
		<form method="post" action="?/delete"
			use:enhance={() => { return async ({ update }) => { await update(); }; }} id="cf-item-del">
			<button type="submit" class="btn btn-danger btn-sm">Delete item</button>
		</form>
	</div>
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>