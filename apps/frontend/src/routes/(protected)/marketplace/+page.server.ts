// apps/frontend/src/routes/(protected)/marketplace/+page.server.ts
import { marketplace, platform, characters, worlds } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const category   = url.searchParams.get('category')   ?? undefined;
	const rarity     = url.searchParams.get('rarity')     ?? undefined;
	const search     = url.searchParams.get('search')     ?? undefined;
	const source     = url.searchParams.get('source')     ?? undefined;
	const minPrice   = url.searchParams.get('minPrice')   ? Number(url.searchParams.get('minPrice'))   : undefined;
	const maxPrice   = url.searchParams.get('maxPrice')   ? Number(url.searchParams.get('maxPrice'))   : undefined;
	const attunement = url.searchParams.get('attunement') !== null && url.searchParams.get('attunement') !== ''
		? url.searchParams.get('attunement') === 'true' : undefined;
	const page       = Number(url.searchParams.get('page') ?? 1);
	const sortBy     = url.searchParams.get('sortBy')     ?? 'name';
	const sortDir    = url.searchParams.get('sortDir')    ?? 'asc';
	const worldId    = url.searchParams.get('worldId')    ?? null;

	const [settings, myChars, allWorlds] = await Promise.all([
		platform.getSettingsMap(),
		characters.getByUserId(locals.user!.id),
		worlds.getAll(),
	]);

	const maxLevel = myChars.reduce((max: number, c: any) => {
		const lvl = (c.classes ?? []).reduce((s: number, cc: any) => s + (cc.allocatedLevel ?? 0), 0);
		return Math.max(max, lvl);
	}, 0);

	// If world filter active, load world overrides to merge into results
	let worldOverrides: Record<string, any> = {};
	if (worldId) {
		const wItems = await marketplace.worldItems.getAll(worldId);
		for (const wi of wItems) {
			worldOverrides[wi.itemId] = wi;
		}
	}

	const result = await marketplace.items.getAll({
		category, rarity, search, source, minPrice, maxPrice,
		attunement, available: true, page, perPage: 24, sortBy, sortDir,
	});

	// Apply world overrides to items — filter out world-unavailable, override price
	const items = (result.items ?? [])
		.filter((item: any) => {
			if (!worldId) return true;
			const wo = worldOverrides[item.id];
			// If world has an override row and isAvailable=false, hide it
			if (wo && wo.isAvailable === false) return false;
			return true;
		})
		.map((item: any) => {
			if (!worldId) return item;
			const wo = worldOverrides[item.id];
			if (!wo) return item;
			return {
				...item,
				buyPrice:    wo.priceOverride ?? item.buyPrice,
				stock:       wo.stock         ?? item.stock,
				worldOverride: true,
			};
		});

	// Worlds for the filter dropdown — only active worlds
	const activeWorlds = (allWorlds as any[]).filter(w => w.isActive);

	return { ...result, items, settings, myChars, maxLevel, worldId, activeWorlds };
};