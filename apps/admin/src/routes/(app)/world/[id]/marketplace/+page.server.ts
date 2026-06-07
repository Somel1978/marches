// apps/admin/src/routes/(app)/world/[id]/marketplace/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Marketplace', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');

	const q = url.searchParams.get('q') ?? '';

	const [worldItems, worldSetting, searchResults] = await Promise.all([
		marketplace.worldItems.getAll(params.id),
		marketplace.worldSettings.get(params.id),
		q.length >= 2 ? marketplace.items.search(q) : Promise.resolve([]),
	]);

	return { world, worldItems, worldSetting, searchResults, q };
};

export const actions: Actions = {
	upsertItem: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Marketplace', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data         = await request.formData();
		const itemId       = data.get('itemId')?.toString() ?? '';
		const stock        = data.get('stock')?.toString();
		const isAvailable  = data.get('isAvailable')?.toString();
		const priceOverride = data.get('priceOverride')?.toString();

		if (!itemId) return fail(400, { message: 'Item required.' });

		try {
			await marketplace.worldItems.upsert(params.id, itemId, {
				stock:         stock === '' ? null : stock !== undefined ? Number(stock) : undefined,
				isAvailable:   isAvailable === '' ? null : isAvailable !== undefined ? isAvailable === 'true' : undefined,
				priceOverride: priceOverride === '' ? null : priceOverride !== undefined ? Number(priceOverride) : undefined,
			});
			return { upsertSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeItem: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Marketplace', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const itemId = data.get('itemId')?.toString() ?? '';
		if (!itemId) return fail(400, { message: 'Item required.' });
		try {
			await marketplace.worldItems.delete(params.id, itemId);
			return { removeSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSettings: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Marketplace', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data             = await request.formData();
		const sellPricePercent = data.get('sellPricePercent')?.toString();
		const stockEnabled     = data.get('stockEnabled')?.toString();
		const levelRestrictions = data.get('levelRestrictions')?.toString();
		try {
			await marketplace.worldSettings.upsert(params.id, {
				sellPricePercent:  sellPricePercent ? Number(sellPricePercent) : null,
				stockEnabled:      stockEnabled === '' ? null : stockEnabled !== undefined ? stockEnabled === 'true' : null,
				levelRestrictions: levelRestrictions ? JSON.parse(levelRestrictions) : null,
			});
			return { settingsSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};