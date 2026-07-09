<!-- apps/frontend/src/routes/(protected)/marketplace/+page.svelte -->
<script lang="ts">
	import { rarityBadge, rarityLabel } from '$lib/rarity';
	import {
		marketplaceFiltersActive,
		marketplaceItemUrl,
		marketplaceListUrl,
		type MarketplaceFilters,
	} from '$lib/marketplace/filters';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const filters = $derived((data as any).filters as MarketplaceFilters);

	const CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];
	const RARITIES = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact'];

	function pageUrl(p: number) {
		return marketplaceListUrl(filters, { page: String(p) });
	}

	function paginationPages(current: number, total: number): (number | '…')[] {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: (number | '…')[] = [1];
		if (current > 4) pages.push('…');
		for (let pg = Math.max(2, current - 2); pg <= Math.min(total - 1, current + 2); pg++) pages.push(pg);
		if (current < total - 3) pages.push('…');
		pages.push(total);
		return pages;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Marketplace</h2>
			<p class="page__subtitle">{data.total.toLocaleString()} items available</p>
		</div>
	</div>

	<!-- Filters -->
	<form
		method="get"
		action="/marketplace"
		style="background:var(--bg-surface); border:1px solid var(--border-muted); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem;"
	>
		<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
			<div class="field" style="margin:0;">
				<label class="label" for="f-search">Name</label>
				<input id="f-search" name="search" type="text" class="input" placeholder="Search…" value={filters.search} />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-world">World</label>
				<select id="f-world" name="worldId" class="input input--select">
					<option value="">All worlds</option>
					{#each ((data as any).activeWorlds ?? []) as w}
						<option value={(w as any).id} selected={filters.worldId === (w as any).id}>{(w as any).name}</option>
					{/each}
				</select>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-source">Source</label>
				<input id="f-source" name="source" type="text" class="input" placeholder="e.g. PHB" value={filters.source} />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-minprice">Min price (GP)</label>
				<input
					id="f-minprice"
					name="minPrice"
					type="number"
					class="input"
					placeholder="0"
					value={filters.minPrice}
					min="0"
					step="0.01"
				/>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-maxprice">Max price (GP)</label>
				<input
					id="f-maxprice"
					name="maxPrice"
					type="number"
					class="input"
					placeholder="Any"
					value={filters.maxPrice}
					min="0"
					step="0.01"
				/>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-category">Category</label>
				<select id="f-category" name="category" class="input input--select">
					<option value="">All</option>
					{#each CATEGORIES as c}
						<option value={c} selected={filters.category === c}>{c}</option>
					{/each}
				</select>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-rarity">Rarity</label>
				<select id="f-rarity" name="rarity" class="input input--select">
					<option value="">All</option>
					{#each RARITIES as r}
						<option value={r} selected={filters.rarity === r}>{r.replace('_', ' ')}</option>
					{/each}
				</select>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-attunement">Attunement</label>
				<select id="f-attunement" name="attunement" class="input input--select">
					<option value="">Any</option>
					<option value="true" selected={filters.attunement === 'true'}>Required</option>
					<option value="false" selected={filters.attunement === 'false'}>Not required</option>
				</select>
			</div>
		</div>
		<div class="field" style="margin:0;">
			<label class="label" for="f-sortby">Sort by</label>
			<div style="display:flex; gap:0.375rem; flex-wrap:wrap">
				<select id="f-sortby" name="sortBy" class="input input--select" style="flex:1;">
					<option value="name" selected={filters.sortBy === 'name'}>Name</option>
					<option value="buyPrice" selected={filters.sortBy === 'buyPrice'}>Price</option>
					<option value="rarity" selected={filters.sortBy === 'rarity'}>Rarity</option>
					<option value="category" selected={filters.sortBy === 'category'}>Category</option>
					<option value="source" selected={filters.sortBy === 'source'}>Source</option>
				</select>
				<select name="sortDir" class="input input--select" style="width:80px;">
					<option value="asc" selected={filters.sortDir === 'asc'}>↑ Asc</option>
					<option value="desc" selected={filters.sortDir === 'desc'}>↓ Desc</option>
				</select>
			</div>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;">
			<button type="submit" class="btn btn-primary btn-sm">Apply filters</button>
			{#if marketplaceFiltersActive(filters)}
				<a href="/marketplace" class="btn btn-ghost btn-sm">Reset</a>
			{/if}
		</div>
	</form>

	{#if data.items.length === 0}
		<div class="card" style="text-align:center; padding:3rem;">
			<p style="color:var(--text-muted);">No items found.</p>
		</div>
	{:else}
		<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem;">
			{#each data.items as item}
				<a href={marketplaceItemUrl(item.id, filters)} style="text-decoration:none; color:inherit;">
					<div class="card" style="height:100%; display:flex; flex-direction:column; gap:0.5rem;">
						{#if item.imageUrl}
							<img
								src={item.imageUrl}
								alt={item.name}
								style="width:48px; height:48px; object-fit:contain; border-radius:var(--radius-sm);"
							/>
						{/if}
						<p style="font-weight:700; font-size:0.9375rem; margin:0;">{item.name}</p>
						<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
							<span class="badge {rarityBadge(item.rarity)}">{rarityLabel(item.rarity)}</span>
							<span class="badge badge-muted">{item.category}</span>
							{#if item.requiresAttunement}<span class="badge badge-warning">Attunement</span>{/if}
						</div>
						<p style="font-size:0.875rem; color:var(--text-muted); margin:0;">{item.source ?? ''}</p>
						<p style="font-weight:700; font-size:1rem; margin-top:auto;">{item.buyPrice.toLocaleString()} GP</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	{#if data.totalPages > 1}
		<div class="pagination" style="margin-top:1.5rem;">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)} class="pagination__page">‹</a>
			{/if}
			{#each paginationPages(data.page, data.totalPages) as p}
				{#if p === '…'}
					<span class="pagination__ellipsis">…</span>
				{:else}
					<a href={pageUrl(p)} class="pagination__page" class:pagination__page--active={p === data.page}>{p}</a>
				{/if}
			{/each}
			{#if data.page < data.totalPages}
				<a href={pageUrl(data.page + 1)} class="pagination__page">›</a>
			{/if}
		</div>
	{/if}
</div>
