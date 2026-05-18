// apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, gameSystems } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found');
	if (character.userId !== locals.user!.id) throw error(403, 'Forbidden');

	// Lazy rest check
	await characters.checkRest(params.id);

	const [transactions] = await Promise.all([
		characters.getTransactions(params.id, 10),
	]);

	// Load game system with classes and subclasses for class allocation UI
	const gameSystem = await gameSystems.getById(character.gameSystemId);

	return { character, transactions, gameSystem };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const avatarUrl   = data.get('avatarUrl')?.toString().trim()   ?? '';
		const portraitUrl = data.get('portraitUrl')?.toString().trim() ?? '';

		if (!name) return fail(400, { message: 'Name is required.' });

		// Verify ownership
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });

		try {
			await characters.update(params.id, {
				name,
				avatarUrl:   avatarUrl   || undefined,
				portraitUrl: portraitUrl || undefined,
			}, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	submitLevelUp: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });

		const data = await request.formData();
		const raw  = data.get('classes')?.toString();
		if (!raw) return fail(400, { message: 'No class data provided.' });

		try {
			const classes = JSON.parse(raw);
			await characters.updateClasses(params.id, classes, locals.user!.id);
			// Set character to PENDING for admin approval
			await characters.updateStatus(params.id, 'PENDING', null, 'Level-up allocation submitted', locals.user!.id);
			return { levelUpSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	retire: async ({ params, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });

		try {
			await characters.updateStatus(params.id, 'RETIRED', 'ADMIN', 'Retired by player', locals.user!.id);
			return { retireSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};