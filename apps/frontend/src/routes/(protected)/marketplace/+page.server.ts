// apps/frontend/src/routes/(protected)/marketplace/+page.server.ts
import { marketplace, characters, worlds } from '@core/database';
import {
	marketplaceFiltersToApi,
	parseMarketplaceFilters,
} from '$lib/marketplace/filters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filters = parseMarketplaceFilters(url);
	const {
		category,
		rarity,
		search,
		source,
		minPrice,
		maxPrice,
		attunement,
		page,
		sortBy,
		sortDir,
		worldId,
	} = marketplaceFiltersToApi(filters);

	const [myChars, allWorlds] = await Promise.all([
		characters.getByUserId(locals.user!.id),
		worlds.getAll(),
	]);

	let worldOverrides: Record<string, any> = {};
	if (worldId) {
		const wItems = await marketplace.worldItems.getAll(worldId);
		for (const wi of wItems) worldOverrides[wi.itemId] = wi;
	}

	const result = await marketplace.items.getAll({
		category,
		rarity,
		search,
		source,
		minPrice,
		maxPrice,
		attunement,
		available: true,
		page,
		perPage: 24,
		sortBy,
		sortDir,
	});

	const items = (result.items ?? [])
		.filter((item: any) => {
			if (!worldId) return true;
			const wo = worldOverrides[item.id];
			if (wo && wo.isAvailable === false) return false;
			return true;
		})
		.map((item: any) => {
			if (!worldId) return item;
			const wo = worldOverrides[item.id];
			if (!wo) return item;
			return {
				...item,
				buyPrice: wo.priceOverride ?? item.buyPrice,
				stock: wo.stock ?? item.stock,
				worldOverride: true,
			};
		});

	const activeWorlds = (allWorlds as any[]).filter((w: any) => w.isActive);

	return { ...result, items, myChars, filters, activeWorlds };
};
