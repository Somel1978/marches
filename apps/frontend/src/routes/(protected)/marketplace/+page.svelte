<!-- apps/frontend/src/routes/(protected)/marketplace/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

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

	const CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];
	const RARITIES   = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact'];

	function param(key: string) {
		if (typeof window === 'undefined') return '';
		return new URL(window.location.href).searchParams.get(key) ?? '';
	}

	function sortUrl(field: string) {
		if (typeof window === 'undefined') return '';
		const u   = new URL(window.location.href);
		const cur = u.searchParams.get('sortBy');
		const dir = cur === field && u.searchParams.get('sortDir') === 'asc' ? 'desc' : 'asc';
		u.searchParams.set('sortBy', field); u.searchParams.set('sortDir', dir); u.searchParams.delete('page');
		return u.search;
	}

	function sortIcon(field: string) {
		if (param('sortBy') !== field) return '↕';
		return param('sortDir') === 'asc' ? '↑' : '↓';
	}

	function pageUrl(p: number) {
		if (typeof window === 'undefined') return `?page=${p}`;
		const u = new URL(window.location.href);
		u.searchParams.set('page', String(p));
		return u.search;
	}

	function paginationPages(current: number, total: number): (number | '…')[] {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: (number | '…')[] = [1];
		if (current > 4) pages.push('…');
		for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) pages.push(p);
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
	<form method="get" style="background:var(--bg-surface); border:1px solid var(--border-muted); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem;">
		<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
			<div class="field" style="margin:0;">
				<label class="label" for="f-search">Name</label>
				<input id="f-search" name="search" type="text" class="input" placeholder="Search…" value={param('search')} />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-source">Source</label>
				<input id="f-source" name="source" type="text" class="input" placeholder="e.g. PHB" value={param('source')} />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-minprice">Min price (GP)</label>
				<input id="f-minprice" name="minPrice" type="number" class="input" placeholder="0" value={param('minPrice')} min="0" step="0.01" />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-maxprice">Max price (GP)</label>
				<input id="f-maxprice" name="maxPrice" type="number" class="input" placeholder="Any" value={param('maxPrice')} min="0" step="0.01" />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-category">Category</label>
				<select id="f-category" name="category" class="input input--select">
					<option value="">All</option>
					{#each CATEGORIES as c}<option value={c} selected={param('category') === c}>{c}</option>{/each}
				</select>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-rarity">Rarity</label>
				<select id="f-rarity" name="rarity" class="input input--select">
					<option value="">All</option>
					{#each RARITIES as r}<option value={r} selected={param('rarity') === r}>{r.replace('_', ' ')}</option>{/each}
				</select>
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="f-attunement">Attunement</label>
				<select id="f-attunement" name="attunement" class="input input--select">
					<option value="">Any</option>
					<option value="true"  selected={param('attunement') === 'true'}>Required</option>
					<option value="false" selected={param('attunement') === 'false'}>Not required</option>
				</select>
			</div>
		</div>
		<div class="field" style="margin:0;">
			<label class="label" for="f-sortby">Sort by</label>
			<div style="display:flex; gap:0.375rem;">
				<select id="f-sortby" name="sortBy" class="input input--select" style="flex:1;">
					<option value="name"     selected={param('sortBy') === 'name'    || !param('sortBy')}>Name</option>
					<option value="buyPrice" selected={param('sortBy') === 'buyPrice'}>Price</option>
					<option value="rarity"   selected={param('sortBy') === 'rarity'  }>Rarity</option>
					<option value="category" selected={param('sortBy') === 'category'}>Category</option>
					<option value="source"   selected={param('sortBy') === 'source'  }>Source</option>
				</select>
				<select name="sortDir" class="input input--select" style="width:80px;">
					<option value="asc"  selected={param('sortDir') === 'asc'  || !param('sortDir')}>↑ Asc</option>
					<option value="desc" selected={param('sortDir') === 'desc'}>↓ Desc</option>
				</select>
			</div>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<button type="submit" class="btn btn-primary btn-sm">Apply filters</button>
			<a href="/marketplace" class="btn btn-ghost btn-sm">Reset</a>
		</div>
	</form>

	{#if data.items.length === 0}
		<div class="card" style="text-align:center; padding:3rem;">
			<p style="color:var(--text-muted);">No items found.</p>
		</div>
	{:else}
		<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem;">
			{#each data.items as item}
				<a href="/marketplace/{item.id}" style="text-decoration:none; color:inherit;">
					<div class="card" style="height:100%; display:flex; flex-direction:column; gap:0.5rem;">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.name} style="width:48px; height:48px; object-fit:contain; border-radius:var(--radius-sm);" />
						{/if}
						<p style="font-weight:700; font-size:0.9375rem; margin:0;">{item.name}</p>
						<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
							<span class="badge {rarityColors[item.rarity] ?? 'badge-muted'}">{item.rarity.replace('_', ' ')}</span>
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