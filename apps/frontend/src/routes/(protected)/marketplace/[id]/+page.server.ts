// apps/frontend/src/routes/(protected)/marketplace/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace, characters } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const urlWorldId = url.searchParams.get('worldId') || null;

	const item = await marketplace.items.getById(params.id);
	if (!item || !item.isAvailable) throw error(404, 'Item not found');

	const myChars     = await characters.getByUserId(locals.user!.id);
	const activeChars = myChars.filter((c: any) => c.status === 'ACTIVE' || c.status === 'RESTING');

	// Collect unique worldIds across all active characters (null = global)
	const worldIds = [...new Set<string | null>(
		activeChars.map((c: any) => c.worldId ?? null)
	)];
	if (!worldIds.includes(null)) worldIds.push(null); // always include global fallback

	// Resolve context for every world in parallel — keyed by worldId or '__global__'
	const contextEntries = await Promise.all(
		worldIds.map(async (wid) => {
			const ctx = await marketplace.resolveContext(item.id, wid);
			return [wid ?? '__global__', ctx] as const;
		})
	);
	const contexts = Object.fromEntries(contextEntries);

	return { item, activeChars, contexts, urlWorldId };
};

export const actions: Actions = {
	buy: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		const quantity    = Number(data.get('quantity') ?? 1);

		if (!characterId) return fail(400, { message: 'Select a character.' });

		try {
			// worldId not needed — createBuyTransaction reads character.worldId
			// authoritatively from the DB, so it cannot be spoofed.
			await marketplace.transactions.buy(characterId, params.id, quantity, locals.user!.id, null);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};