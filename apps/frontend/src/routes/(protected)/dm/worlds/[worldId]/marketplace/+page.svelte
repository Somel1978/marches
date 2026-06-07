<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world        = $derived((data as any).world);
	const worldItems   = $derived((data as any).worldItems ?? []);
	const worldSetting = $derived((data as any).worldSetting);
	const allItems     = $derived((data as any).allItems ?? []);

	const availableItems = $derived(
		allItems.filter((i: any) => !worldItems.some((wi: any) => wi.itemId === i.id))
	);

	let addItemId    = $state('');
	let addItemName  = $state('');
	let addStock     = $state('');
	let addPrice     = $state('');
	let searchQuery  = $state('');
	let showDropdown = $state(false);
	let savingSettings = $state(false);

	const searchResults = $derived(
		searchQuery.length < 2 ? [] :
		availableItems.filter((i: any) =>
			i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			i.baseItem?.toLowerCase().includes(searchQuery.toLowerCase())
		).slice(0, 15)
	);

	function selectItem(item: any) {
		addItemId    = item.id;
		addItemName  = item.name;
		searchQuery  = item.name;
		showDropdown = false;
	}

	const RARITIES   = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact', 'Unknown'];
	const CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];

	type Tier = {
		minLevel: number;
		maxLevel: number;
		maxRarity: string | null;
		maxValue: number | null;
		allowedCategories: string[];
	};

	let tiers = $state<Tier[]>([]);

	$effect.pre(() => {
		try {
			const raw = worldSetting?.levelRestrictions;
			tiers = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
		} catch {
			tiers = [];
		}
	});

	function addTier() {
		tiers = [...tiers, { minLevel: 1, maxLevel: 4, maxRarity: 'Common', maxValue: 100, allowedCategories: [] }];
	}
	function removeTier(i: number) {
		tiers = tiers.filter((_, idx) => idx !== i);
	}
	function toggleCategory(tier: Tier, cat: string) {
		if (tier.allowedCategories.includes(cat)) {
			tier.allowedCategories = tier.allowedCategories.filter(c => c !== cat);
		} else {
			tier.allowedCategories = [...tier.allowedCategories, cat];
		}
		tiers = [...tiers];
	}
	function tiersJson() { return JSON.stringify(tiers); }
</script>

{#if form?.message}<div class="form-error">{form.message}</div>{/if}
{#if (form as any)?.upsertSuccess}<div class="form-success">Item updated.</div>{/if}
{#if (form as any)?.removeSuccess}<div class="form-success">Item removed.</div>{/if}
{#if (form as any)?.settingsSuccess}<div class="form-success">Settings saved.</div>{/if}

<!-- World settings -->
<form method="post" action="?/saveSettings" use:enhance={() => {
	savingSettings = true;
	return async ({ update }) => { savingSettings = false; await update(); await invalidateAll(); };
}}>
	<input type="hidden" name="levelRestrictions" value={tiersJson()} />

	<div class="card" style="margin-bottom:1.5rem;">
		<h3 class="section-title">World marketplace settings</h3>
		<p class="field-hint" style="margin-bottom:0.75rem;">Leave blank / inherit to use global settings.</p>
		<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
			<div class="field" style="flex:1 1 140px; margin:0;">
				<label class="label" for="sellPct">Sell price %</label>
				<input id="sellPct" name="sellPricePercent" type="number" class="input" min="0" max="100"
					value={worldSetting?.sellPricePercent ?? ''} placeholder="Global default" />
			</div>
			<div class="field" style="flex:1 1 160px; margin:0;">
				<label class="label" for="stockEn">Stock enabled</label>
				<select id="stockEn" name="stockEnabled" class="input input--select">
					<option value="">Global default</option>
					<option value="true"  selected={worldSetting?.stockEnabled === true}>Yes</option>
					<option value="false" selected={worldSetting?.stockEnabled === false}>No</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Level restrictions -->
	<div class="card" style="margin-bottom:1.5rem;">
		<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap">
			<div>
				<h3 class="section-title" style="margin:0;">Level restrictions</h3>
				<p class="field-hint" style="margin-top:0.25rem;">Overrides global restrictions for this world. Leave empty to inherit global.</p>
			</div>
			<button type="button" class="btn btn-ghost btn-sm" onclick={addTier}>+ Add tier</button>
		</div>

		{#if tiers.length === 0}
			<p class="table__empty">No world restrictions — inheriting global level restriction settings.</p>
		{:else}
			<div style="display:flex; flex-direction:column; gap:1rem;">
				{#each tiers as tier, i}
					<div class="card" style="border-color:var(--border-accent); position:relative; padding:1rem;">
						<button type="button" class="btn btn-ghost btn-sm btn-icon"
							style="position:absolute; top:0.75rem; right:0.75rem;"
							onclick={() => removeTier(i)} aria-label="Remove tier">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
							</svg>
						</button>
						<div style="display:flex; gap:1rem; flex-wrap:wrap;">
							<div class="field" style="flex:1; min-width:80px;">
								<label class="label" for="t-minlv-{i}">Min level</label>
								<input id="t-minlv-{i}" type="number" class="input" min="1" max="20" bind:value={tier.minLevel} />
							</div>
							<div class="field" style="flex:1; min-width:80px;">
								<label class="label" for="t-maxlv-{i}">Max level</label>
								<input id="t-maxlv-{i}" type="number" class="input" min="1" max="20" bind:value={tier.maxLevel} />
							</div>
							<div class="field" style="flex:2; min-width:120px;">
								<label class="label" for="t-rarity-{i}">Max rarity</label>
								<select id="t-rarity-{i}" class="input input--select" bind:value={tier.maxRarity}>
									<option value={null}>No limit</option>
									{#each RARITIES as r}
										<option value={r}>{r.replace('_', ' ')}</option>
									{/each}
								</select>
							</div>
							<div class="field" style="flex:2; min-width:120px;">
								<label class="label" for="t-maxval-{i}">Max value (GP)</label>
								<input id="t-maxval-{i}" type="number" class="input" min="0" placeholder="No limit"
									value={tier.maxValue ?? ''}
									oninput={(e) => { const v = (e.target as HTMLInputElement).value; tier.maxValue = v === '' ? null : Number(v); tiers = [...tiers]; }} />
							</div>
						</div>
						<div class="field" style="margin-top:0.5rem;">
							<span class="label">Allowed categories <span class="optional">(empty = all)</span></span>
							<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.25rem;">
								{#each CATEGORIES as cat}
									<label style="display:flex; align-items:center; gap:0.375rem; cursor:pointer; font-size:0.875rem; flex-wrap:wrap">
										<input type="checkbox"
											checked={tier.allowedCategories.includes(cat)}
											onchange={() => toggleCategory(tier, cat)} />
										{cat}
									</label>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="form-actions" style="margin-bottom:2rem;">
		<button type="submit" class="btn btn-primary" disabled={savingSettings}>
			{savingSettings ? 'Saving…' : 'Save world settings'}
		</button>
	</div>
</form>

<!-- Add item override -->
<div class="card" style="margin-bottom:1.5rem;">
	<h3 class="section-title">Add item override</h3>
	<form method="post" action="?/upsertItem" use:enhance={()=>{return async({update})=>{addItemId='';addItemName='';addStock='';addPrice='';searchQuery='';await update();await invalidateAll();};}}>
		<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
			<div class="field" style="flex:2 1 200px; margin:0; position:relative;">
				<label class="label" for="itemSearch">Item</label>
				<input id="itemSearch" type="text" class="input" placeholder="Search catalogue…"
					bind:value={searchQuery}
					oninput={() => { showDropdown = true; addItemId = ''; addItemName = ''; }}
					onfocus={() => showDropdown = true}
					autocomplete="off" />
				<input type="hidden" name="itemId" value={addItemId} />
				{#if showDropdown && searchResults.length > 0}
					<div style="position:absolute; top:100%; left:0; right:0; background:var(--bg-surface); border:1px solid var(--border-muted); border-radius:var(--radius-md); z-index:50; max-height:240px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.4);">
						{#each searchResults as item}
							<button type="button"
								style="display:block; width:100%; text-align:left; padding:0.5rem 0.75rem; background:none; border:none; cursor:pointer; font-size:0.875rem; border-bottom:1px solid var(--border-muted);"
								onmousedown={() => selectItem(item)}>
								<span style="font-weight:600;">{item.name}</span>
								<span style="color:var(--text-muted); font-size:0.75rem;"> — {item.rarity} · {item.buyPrice} GP</span>
							</button>
						{/each}
					</div>
				{/if}
				{#if addItemId}
					<p class="field-hint" style="margin-top:0.25rem; color:var(--color-success);">✓ {addItemName} selected</p>
				{/if}
			</div>
			<div class="field" style="flex:0 0 90px; margin:0;">
				<label class="label" for="addStock">Stock <span class="optional">(blank=global)</span></label>
				<input id="addStock" name="stock" type="number" class="input" min="0" bind:value={addStock} placeholder="—" />
			</div>
			<div class="field" style="flex:0 0 110px; margin:0;">
				<label class="label" for="addPrice">Price override <span class="optional">(blank=global)</span></label>
				<input id="addPrice" name="priceOverride" type="number" class="input" min="0" bind:value={addPrice} placeholder="—" />
			</div>
			<div class="field" style="flex:0 0 auto; margin:0;">
				<label class="label" for="addAvailable">Available</label>
				<select id="addAvailable" name="isAvailable" class="input input--select" style="width:120px;">
					<option value="">Global default</option>
					<option value="true">Yes</option>
					<option value="false">No</option>
				</select>
			</div>
			<button type="submit" class="btn btn-primary btn-sm" disabled={!addItemId}>Add</button>
		</div>
		{#if !addItemId && searchQuery.length >= 2 && searchResults.length === 0}
			<p class="field-hint" style="color:var(--color-danger); margin-top:0.25rem;">No items found matching "{searchQuery}"</p>
		{/if}
	</form>
</div>

<!-- World items table -->
<div class="card">
	<h3 class="section-title">World item overrides ({worldItems.length})</h3>
	{#if worldItems.length}
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th>Item</th>
					<th>Rarity</th>
					<th>Global price</th>
					<th>World price</th>
					<th>Stock</th>
					<th>Available</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each worldItems as wi}
					<tr>
						<td style="font-weight:600;">{wi.item.name}</td>
						<td><span class="badge badge-muted">{wi.item.rarity}</span></td>
						<td class="table__muted">{wi.item.buyPrice} GP</td>
						<td>
							{#if wi.priceOverride !== null}
								<strong>{wi.priceOverride} GP</strong>
							{:else}
								<span class="table__muted">—</span>
							{/if}
						</td>
						<td>
							{#if wi.stock !== null}
								<span class="badge badge-accent">{wi.stock}</span>
							{:else}
								<span class="table__muted">Global</span>
							{/if}
						</td>
						<td>
							{#if wi.isAvailable === true}
								<span class="badge badge-success">Yes</span>
							{:else if wi.isAvailable === false}
								<span class="badge badge-danger">No</span>
							{:else}
								<span class="table__muted">Global</span>
							{/if}
						</td>
						<td class="table__action">
							<form method="post" action="?/upsertItem" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
								<input type="hidden" name="itemId" value={wi.itemId} />
								<input type="hidden" name="priceOverride" value={wi.priceOverride ?? ''} />
								<input type="hidden" name="isAvailable" value={wi.isAvailable ?? ''} />
								<div style="display:flex; align-items:center; gap:0.25rem; flex-wrap:wrap">
									<input name="stock" type="number" class="input" min="0" style="width:64px; padding:0.25rem 0.375rem; font-size:0.8rem;"
										value={wi.stock ?? ''} placeholder="—" />
									<button type="submit" class="btn btn-ghost btn-sm">Save</button>
								</div>
							</form>
							<form method="post" action="?/removeItem" use:enhance={({cancel})=>{
								if(!confirm('Remove this world override?'))cancel();
								return async({update})=>{await update();await invalidateAll();};
							}}>
								<input type="hidden" name="itemId" value={wi.itemId} />
								<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		</div>
	{:else}
		<p class="table__empty">No world overrides yet — items use global catalogue settings.</p>
	{/if}
</div>