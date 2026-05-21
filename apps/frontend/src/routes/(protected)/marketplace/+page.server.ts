// apps/frontend/src/routes/(protected)/marketplace/+page.server.ts
import { marketplace, platform, characters } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const category = url.searchParams.get('category') ?? undefined;
	const rarity   = url.searchParams.get('rarity')   ?? undefined;
	const search   = url.searchParams.get('search')   ?? undefined;
	const source   = url.searchParams.get('source')   ?? undefined;
	const minPrice   = url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined;
	const maxPrice   = url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined;
	const attunement = url.searchParams.get('attunement') !== null && url.searchParams.get('attunement') !== ''
		? url.searchParams.get('attunement') === 'true' : undefined;
	const page     = Number(url.searchParams.get('page') ?? 1);

	const settings  = await platform.getSettingsMap();
	const myChars   = await characters.getByUserId(locals.user!.id);

	// Compute max character level for restriction display
	const maxLevel = myChars.reduce((max: number, c: any) => {
		const lvl = (c.classes ?? []).reduce((s: number, cc: any) => s + (cc.allocatedLevel ?? 0), 0);
		return Math.max(max, lvl);
	}, 0);

	const sortBy  = url.searchParams.get('sortBy')  ?? 'name';
	const sortDir = url.searchParams.get('sortDir') ?? 'asc';

	const result = await marketplace.items.getAll({
		category, rarity, search, source, minPrice, maxPrice, attunement, available: true, page, perPage: 24, sortBy, sortDir,
	});

	return { ...result, settings, myChars, maxLevel };
};