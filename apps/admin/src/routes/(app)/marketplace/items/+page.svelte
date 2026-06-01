<!-- apps/admin/src/routes/(app)/marketplace/items/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const rarityColors: Record<string, string> = {
		Mundane:   'badge-muted', Common:    'badge-muted',
		Uncommon:  'badge-accent', Rare:     'badge-success',
		Very_Rare: 'badge-warning', Legendary:'badge-danger',
		Artifact:  'badge-danger', Unknown:  'badge-muted',
	};

	const CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];
	const RARITIES   = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact'];

	function param(key: string) {
		if (typeof window === 'undefined') return '';
		return new URL(window.location.href).searchParams.get(key) ?? '';
	}

	function pageUrl(p: number) {
		if (typeof window === 'undefined') return `?page=${p}`;
		const u = new URL(window.location.href);
		u.searchParams.set('page', String(p));
		return u.search;
	}

	function sortUrl(field: string) {
		if (typeof window === 'undefined') return '';
		const u   = new URL(window.location.href);
		const cur = u.searchParams.get('sortBy');
		const dir = cur === field && u.searchParams.get('sortDir') === 'asc' ? 'desc' : 'asc';
		u.searchParams.set('sortBy', field);
		u.searchParams.set('sortDir', dir);
		u.searchParams.delete('page');
		return u.search;
	}

	function sortIcon(field: string) {
		if (param('sortBy') !== field) return '↕';
		return param('sortDir') === 'asc' ? '↑' : '↓';
	}

	// Smart pagination: show first, last, current±2, with ellipsis
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
			<h2 class="page__title">Marketplace Items</h2>
			<p class="page__subtitle">{data.total.toLocaleString()} items</p>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<a href="/marketplace/data/export" class="btn btn-ghost btn-sm" download>↓ Export</a>
			<a href="/marketplace/data/import" class="btn btn-primary btn-sm">↑ Import</a>
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
		<input type="hidden" name="sortBy"  value={param('sortBy')} />
		<input type="hidden" name="sortDir" value={param('sortDir')} />
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<button type="submit" class="btn btn-primary btn-sm">Apply filters</button>
			<a href="/marketplace/items" class="btn btn-ghost btn-sm">Reset</a>
		</div>
	</form>

	<div class="table-wrap card">
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th><a href={sortUrl('name')}     style="text-decoration:none; color:inherit;">Name {sortIcon('name')}</a></th>
					<th class="col-hide-mobile"><a href={sortUrl('category')} style="text-decoration:none; color:inherit;">Category {sortIcon('category')}</a></th>
					<th><a href={sortUrl('rarity')}   style="text-decoration:none; color:inherit;">Rarity {sortIcon('rarity')}</a></th>
					<th><a href={sortUrl('buyPrice')} style="text-decoration:none; color:inherit;">Price (GP) {sortIcon('buyPrice')}</a></th>
					<th class="col-hide-tablet"><a href={sortUrl('source')} style="text-decoration:none; color:inherit;">Source {sortIcon('source')}</a></th>
					<th>Available</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item}
					<tr>
						<td>
							<a href="/marketplace/items/{item.id}" class="table__name">{item.name}</a>
							{#if item.requiresAttunement}<span class="badge badge-muted" style="margin-left:0.25rem; font-size:0.7rem;">ATT</span>{/if}
							{#if item.isDestroyable}<span class="badge badge-warning" style="margin-left:0.25rem; font-size:0.7rem;">DEST</span>{/if}
						</td>
						<td class="col-hide-mobile"><span class="badge badge-muted">{item.category}</span></td>
						<td><span class="badge {rarityColors[item.rarity] ?? 'badge-muted'}">{item.rarity.replace('_', ' ')}</span></td>
						<td>{item.buyPrice.toLocaleString()}</td>
						<td class="table__muted col-hide-tablet">{item.source ?? '—'}</td>
						<td><span class="badge {item.isAvailable ? 'badge-success' : 'badge-danger'}">{item.isAvailable ? 'Yes' : 'No'}</span></td>
						<td class="table__action"><a href="/marketplace/items/{item.id}" class="btn btn-ghost btn-sm">Edit</a></td>
					</tr>
				{:else}
					<tr><td colspan="7" class="table__empty">No items found.</td></tr>
				{/each}
			</tbody>
		</table>
</div>
	</div>

	{#if data.totalPages > 1}
		<div class="pagination">
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