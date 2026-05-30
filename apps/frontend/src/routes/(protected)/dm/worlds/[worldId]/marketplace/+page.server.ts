// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage, world } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const [worldItems, worldSetting, allItems] = await Promise.all([
		marketplace.worldItems.getAll(params.worldId),
		marketplace.worldSettings.get(params.worldId),
		marketplace.items.getAll({ page: 1, perPage: 500 }),
	]);

	return { world, worldItems, worldSetting, allItems: allItems.items ?? [] };
};

export const actions: Actions = {
	upsertItem: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data          = await request.formData();
		const itemId        = data.get('itemId')?.toString() ?? '';
		const stock         = data.get('stock')?.toString();
		const isAvailable   = data.get('isAvailable')?.toString();
		const priceOverride = data.get('priceOverride')?.toString();
		if (!itemId) return fail(400, { message: 'Item required.' });
		try {
			await marketplace.worldItems.upsert(params.worldId, itemId, {
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
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const itemId = data.get('itemId')?.toString() ?? '';
		if (!itemId) return fail(400, { message: 'Item required.' });
		try {
			await marketplace.worldItems.delete(params.worldId, itemId);
			return { removeSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSettings: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data              = await request.formData();
		const sellPricePercent  = data.get('sellPricePercent')?.toString();
		const stockEnabled      = data.get('stockEnabled')?.toString();
		const levelRestrictions = data.get('levelRestrictions')?.toString();
		try {
			await marketplace.worldSettings.upsert(params.worldId, {
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
