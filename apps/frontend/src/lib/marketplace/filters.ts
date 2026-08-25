/** Marketplace list filter helpers — keep query params in sync across list ↔ item navigation. */

export const MARKETPLACE_FILTER_KEYS = [
	'search',
	'worldId',
	'source',
	'minPrice',
	'maxPrice',
	'category',
	'rarity',
	'attunement',
	'sortBy',
	'sortDir',
	'page',
] as const;

export type MarketplaceFilterKey = (typeof MARKETPLACE_FILTER_KEYS)[number];

export type MarketplaceFilters = Record<MarketplaceFilterKey, string>;

export function emptyMarketplaceFilters(): MarketplaceFilters {
	return {
		search: '',
		worldId: '',
		source: '',
		minPrice: '',
		maxPrice: '',
		category: '',
		rarity: '',
		attunement: '',
		sortBy: 'name',
		sortDir: 'asc',
		page: '1',
	};
}

export function parseMarketplaceFilters(url: URL): MarketplaceFilters {
	const empty = emptyMarketplaceFilters();
	return {
		search: url.searchParams.get('search') ?? empty.search,
		worldId: url.searchParams.get('worldId') ?? empty.worldId,
		source: url.searchParams.get('source') ?? empty.source,
		minPrice: url.searchParams.get('minPrice') ?? empty.minPrice,
		maxPrice: url.searchParams.get('maxPrice') ?? empty.maxPrice,
		category: url.searchParams.get('category') ?? empty.category,
		rarity: url.searchParams.get('rarity') ?? empty.rarity,
		attunement: url.searchParams.get('attunement') ?? empty.attunement,
		sortBy: url.searchParams.get('sortBy') ?? empty.sortBy,
		sortDir: url.searchParams.get('sortDir') ?? empty.sortDir,
		page: url.searchParams.get('page') ?? empty.page,
	};
}

export function marketplaceFiltersActive(filters: MarketplaceFilters): boolean {
	return MARKETPLACE_FILTER_KEYS.some((key) => {
		if (key === 'sortBy' || key === 'sortDir' || key === 'page') return false;
		return !!filters[key];
	});
}

/** Build `/marketplace?…` preserving non-default filter params. */
export function marketplaceListUrl(
	filters: MarketplaceFilters,
	overrides: Partial<MarketplaceFilters> = {},
): string {
	const merged = { ...filters, ...overrides };
	const p = new URLSearchParams();
	for (const key of MARKETPLACE_FILTER_KEYS) {
		const v = merged[key];
		if (!v) continue;
		if (key === 'page' && v === '1') continue;
		if (key === 'sortBy' && v === 'name' && merged.sortDir === 'asc') continue;
		if (key === 'sortDir' && v === 'asc' && merged.sortBy === 'name') continue;
		p.set(key, v);
	}
	const qs = p.toString();
	return `/marketplace${qs ? `?${qs}` : ''}`;
}

/** Build item detail URL carrying list filters for the back link. */
export function marketplaceItemUrl(itemId: string, filters: MarketplaceFilters): string {
	const p = new URLSearchParams();
	for (const key of MARKETPLACE_FILTER_KEYS) {
		const v = filters[key];
		if (!v) continue;
		if (key === 'page' && v === '1') continue;
		if (key === 'sortBy' && v === 'name' && filters.sortDir === 'asc') continue;
		if (key === 'sortDir' && v === 'asc' && filters.sortBy === 'name') continue;
		p.set(key, v);
	}
	const qs = p.toString();
	return `/marketplace/${itemId}${qs ? `?${qs}` : ''}`;
}

/** Convert parsed filters to marketplace.items.getAll API params. */
export function marketplaceFiltersToApi(filters: MarketplaceFilters) {
	return {
		category: filters.category || undefined,
		rarity: filters.rarity || undefined,
		search: filters.search || undefined,
		source: filters.source || undefined,
		minPrice:
			filters.minPrice !== '' ? Number(filters.minPrice) : undefined,
		maxPrice:
			filters.maxPrice !== '' ? Number(filters.maxPrice) : undefined,
		attunement:
			filters.attunement === ''
				? undefined
				: filters.attunement === 'true',
		page: Number(filters.page || 1),
		sortBy: filters.sortBy || 'name',
		sortDir: filters.sortDir || 'asc',
		worldId: filters.worldId || null,
	};
}
