// apps/frontend/src/routes/(protected)/token-store/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { tokenStore, characters } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const item = await tokenStore.items.getById(params.id);
	if (!item || !item.isActive) throw error(404, 'Item not found');

	const myChars    = await characters.getByUserId(locals.user!.id);
	const eligible   = (myChars as any[]).filter((c: any) => {
		if (!['ACTIVE','RESTING'].includes(c.status)) return false;
		if (item.gameSystemId && item.gameSystemId !== c.gameSystemId) return false;
		if ((item as any).scope === 'WORLD' && (item as any).worldId && c.worldId !== (item as any).worldId) return false;
		return true;
	});

	return { item, eligible };
};

export const actions: Actions = {
	buy: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		if (!characterId) return fail(400, { message: 'Select a character.' });
		try {
			await tokenStore.transactions.purchase(characterId, params.id, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
