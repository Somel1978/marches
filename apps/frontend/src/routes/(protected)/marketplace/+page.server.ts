// apps/frontend/src/routes/(protected)/marketplace/+page.server.ts
import { marketplace, characters, worlds } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const category   = url.searchParams.get('category')   ?? undefined;
	const rarity     = url.searchParams.get('rarity')     ?? undefined;
	const search     = url.searchParams.get('search')     ?? undefined;
	const source     = url.searchParams.get('source')     ?? undefined;
	const minPrice   = url.searchParams.get('minPrice')   !== null && url.searchParams.get('minPrice')   !== '' ? Number(url.searchParams.get('minPrice'))   : undefined;
	const maxPrice   = url.searchParams.get('maxPrice')   !== null && url.searchParams.get('maxPrice')   !== '' ? Number(url.searchParams.get('maxPrice'))   : undefined;
	const attunement = url.searchParams.get('attunement') !== null && url.searchParams.get('attunement') !== ''
		? url.searchParams.get('attunement') === 'true' : undefined;
	const page       = Number(url.searchParams.get('page') ?? 1);
	const sortBy     = url.searchParams.get('sortBy')     ?? 'name';
	const sortDir    = url.searchParams.get('sortDir')    ?? 'asc';
	const worldId    = url.searchParams.get('worldId')    ?? null;

	const [myChars, allWorlds] = await Promise.all([
		characters.getByUserId(locals.user!.id),
		worlds.getAll(),
	]);

	// Load world overrides if a world filter is active
	let worldOverrides: Record<string, any> = {};
	if (worldId) {
		const wItems = await marketplace.worldItems.getAll(worldId);
		for (const wi of wItems) worldOverrides[wi.itemId] = wi;
	}

	const result = await marketplace.items.getAll({
		category, rarity, search, source, minPrice, maxPrice,
		attunement, available: true, page, perPage: 24, sortBy, sortDir,
	});

	// Apply world overrides — hide unavailable, show overridden price/stock
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
				buyPrice:      wo.priceOverride ?? item.buyPrice,
				stock:         wo.stock         ?? item.stock,
				worldOverride: true,
			};
		});

	const activeWorlds = (allWorlds as any[]).filter((w: any) => w.isActive);

	return { ...result, items, myChars, worldId, activeWorlds };
};