// apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { quests, characters } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const quest = await quests.getById(params.id);
	if (!quest || quest.status !== 'PUBLISHED') throw error(404, 'Quest not found');

	// Load player's eligible characters
	const myChars  = await characters.getByUserId(locals.user!.id);
	const eligible = myChars.filter(c => {
		if (c.status !== 'ACTIVE') return false;
		const level = (c as any).classes?.reduce((s: number, cc: any) => s + cc.allocatedLevel, 0) ?? 0;
		return level >= quest.minLevel && level <= quest.maxLevel;
	});

	// Find existing signups for this player's characters
	const mySignups = quest.signups.filter(s =>
		myChars.some(c => c.id === s.characterId) && s.status !== 'CANCELLED'
	);

	return { quest, eligible, mySignups };
};

export const actions: Actions = {
	signup: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		if (!characterId) return fail(400, { message: 'Select a character.' });
		try {
			await quests.signup(params.id, characterId, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	cancel: async ({ request, locals }) => {
		const data     = await request.formData();
		const signupId = data.get('signupId')?.toString() ?? '';
		const note     = data.get('note')?.toString().trim();
		try {
			await quests.cancelSignup(signupId, note, locals.user!.id);
			return { cancelled: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
