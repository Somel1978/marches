// apps/frontend/src/routes/(protected)/marketplace/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace, characters, platform } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const item = await marketplace.items.getById(params.id);
	if (!item || !item.isAvailable) throw error(404, 'Item not found');

	const [myChars, settings] = await Promise.all([
		characters.getByUserId(locals.user!.id),
		platform.getSettingsMap(),
	]);

	const activeChars = myChars.filter((c: any) => c.status === 'ACTIVE');
	const sellPct     = Number(settings['marketplace.sellPricePercent'] ?? 50);

	return { item, activeChars, sellPrice: Math.floor(item.buyPrice * sellPct / 100) };
};

export const actions: Actions = {
	buy: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		const quantity    = Number(data.get('quantity') ?? 1);

		if (!characterId) return fail(400, { message: 'Select a character.' });

		try {
			await marketplace.transactions.buy(characterId, params.id, quantity, locals.user!.id);
			return { success: true, action: 'buy' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
