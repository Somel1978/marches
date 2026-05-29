<!-- apps/admin/src/routes/(app)/world/[id]/marketplace/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world       = $derived((data as any).world);
	const worldItems  = $derived((data as any).worldItems ?? []);
	const worldSetting = $derived((data as any).worldSetting);
	const allItems    = $derived((data as any).allItems ?? []);

	// Items not yet in this world
	const availableItems = $derived(
		allItems.filter((i: any) => !worldItems.some((wi: any) => wi.itemId === i.id))
	);

	let addItemId    = $state('');
	let addItemName  = $state('');
	let addStock     = $state('');
	let addPrice     = $state('');
	let searchQuery  = $state('');
	let showDropdown = $state(false);

	const searchResults = $derived(
		searchQuery.length < 2 ? [] :
		availableItems.filter((i: any) =>
			i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			i.baseItem?.toLowerCase().includes(searchQuery.toLowerCase())
		).slice(0, 15)
	);

	function selectItem(item: any) {
		addItemId   = item.id;
		addItemName = item.name;
		searchQuery = item.name;
		showDropdown = false;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.id}" class="back-link">← {world.name}</a>
			<h2 class="page__title">Marketplace — {world.name}</h2>
			<p class="page__subtitle">Override global catalogue per world</p>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if (form as any)?.upsertSuccess}<div class="form-success">Item updated.</div>{/if}
	{#if (form as any)?.removeSuccess}<div class="form-success">Item removed.</div>{/if}
	{#if (form as any)?.settingsSuccess}<div class="form-success">Settings saved.</div>{/if}

	<!-- World settings -->
	<div class="card" style="margin-bottom:1.5rem;">
		<h3 class="section-title">World marketplace settings</h3>
		<p class="field-hint" style="margin-bottom:0.75rem;">Leave blank to inherit global settings.</p>
		<form method="post" action="?/saveSettings" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
			<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
				<div class="field" style="flex:1 1 140px; margin:0;">
					<label class="label" for="sellPct">Sell price %</label>
					<input id="sellPct" name="sellPricePercent" type="number" class="input" min="0" max="100"
						value={worldSetting?.sellPricePercent ?? ''} placeholder="Global default" />
				</div>
				<div class="field" style="flex:1 1 140px; margin:0;">
					<label class="label" for="stockEn">Stock enabled</label>
					<select id="stockEn" name="stockEnabled" class="input input--select">
						<option value="">Global default</option>
						<option value="true"  selected={worldSetting?.stockEnabled === true}>Yes</option>
						<option value="false" selected={worldSetting?.stockEnabled === false}>No</option>
					</select>
				</div>
				<button type="submit" class="btn btn-primary btn-sm">Save settings</button>
			</div>
		</form>
	</div>

	<!-- Add item -->
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
					<input id="addStock" name="stock" type="number" class="input" min="0"
						bind:value={addStock} placeholder="—" />
				</div>
				<div class="field" style="flex:0 0 110px; margin:0;">
					<label class="label" for="addPrice">Price override <span class="optional">(blank=global)</span></label>
					<input id="addPrice" name="priceOverride" type="number" class="input" min="0"
						bind:value={addPrice} placeholder="—" />
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
			<div style="display:none">
			</div>
		</form>
	</div>

	<!-- World items table -->
	<div class="card">
		<h3 class="section-title">World item overrides ({worldItems.length})</h3>
		{#if worldItems.length}
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
							<td style="display:flex; gap:0.5rem;">
								<!-- Quick stock adjust -->
								<form method="post" action="?/upsertItem" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}>
									<input type="hidden" name="itemId" value={wi.itemId} />
									<input type="hidden" name="priceOverride" value={wi.priceOverride ?? ''} />
									<input type="hidden" name="isAvailable" value={wi.isAvailable ?? ''} />
									<div style="display:flex; align-items:center; gap:0.25rem;">
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
									<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Remove</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="table__empty">No world overrides yet — items use global catalogue settings.</p>
		{/if}
	</div>
</div>