// apps/admin/src/routes/(app)/marketplace/items/+page.server.ts
import { error } from '@sveltejs/kit';
import { marketplace } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const category  = url.searchParams.get('category')  ?? undefined;
	const rarity    = url.searchParams.get('rarity')    ?? undefined;
	const search    = url.searchParams.get('search')    ?? undefined;
	const source    = url.searchParams.get('source')    ?? undefined;
	const minPrice   = url.searchParams.get('minPrice')  ? Number(url.searchParams.get('minPrice'))  : undefined;
	const maxPrice   = url.searchParams.get('maxPrice')  ? Number(url.searchParams.get('maxPrice'))  : undefined;
	const attunement = url.searchParams.get('attunement') !== null && url.searchParams.get('attunement') !== ''
		? url.searchParams.get('attunement') === 'true' : undefined;
	const available = url.searchParams.get('available') !== null && url.searchParams.get('available') !== ''
		? url.searchParams.get('available') === 'true' : undefined;
	const sortBy    = url.searchParams.get('sortBy')    ?? 'name';
	const sortDir   = url.searchParams.get('sortDir')   ?? 'asc';
	const page      = Number(url.searchParams.get('page') ?? 1);

	return await marketplace.items.getAll({ category, rarity, search, source, minPrice, maxPrice, attunement, available, page, perPage: 50, sortBy, sortDir });
};