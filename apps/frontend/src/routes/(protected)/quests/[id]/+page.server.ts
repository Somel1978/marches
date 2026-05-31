// apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { quests, dms, characters, platform, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const quest = await quests.getById(params.id);
	if (!quest) throw error(404, 'Quest not found');

	const allowedStatuses = ['PUBLISHED', 'IN_PROGRESS', 'PENDING_RESULT', 'PENDING_RESULT_APPROVAL', 'COMPLETED'];
	if (!allowedStatuses.includes(quest.status)) throw error(404, 'Quest not found');

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

	// Load existing DM rating for completed quests
	const settings       = await platform.getSettingsMap();
	const ratingsEnabled = settings['dm.ratingsEnabled'] !== 'false';
	// Load result characters for completed quests
	let resultCharacters: any[] = [];
	if (quest.status === 'COMPLETED') {
		const result = await quests.getResult(params.id);
		resultCharacters = result?.characters ?? [];
	}

	const existingRating = (quest.status === 'COMPLETED' && ratingsEnabled)
		? await dms.ratings.getForQuest(params.id, locals.user!.id).catch(() => null)
		: null;

	return { quest, eligible, mySignups, existingRating, ratingsEnabled, resultCharacters };
};

export const actions: Actions = {
	rate: async ({ params, request, locals }) => {
		const data    = await request.formData();
		const rating  = Number(data.get('rating') ?? 0);
		const comment = data.get('comment')?.toString().trim() || undefined;
		try {
			await dms.ratings.submit(params.id, locals.user!.id, rating, comment);
			return { rateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	signup: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		if (!characterId) return fail(400, { message: 'Select a character.' });
		try {
			// Guard: only PUBLISHED quests accept signups
			const questForCheck = await quests.getById(params.id);
			if (!questForCheck || questForCheck.status !== 'PUBLISHED')
				return fail(400, { message: 'This quest is no longer accepting signups.' });
			// World lock check
			const char = await characters.getById(characterId);
			if (char && questForCheck) {
				const questWorld = (questForCheck as any).worldId ?? null;
				if (questWorld) {
					if (!char.isGlobal && char.worldId && char.worldId !== questWorld) {
						return fail(400, { message: 'This character is locked to a different world.' });
					}
					if (char.isGlobal) {
						const world = await worlds.getById(questWorld);
						if (world && !(world as any).acceptsGlobalCharacters) {
							return fail(400, { message: 'This world does not accept global characters.' });
						}
					}
				}
			}
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