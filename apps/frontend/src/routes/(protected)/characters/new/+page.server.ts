// apps/frontend/src/routes/(protected)/characters/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { characters, gameSystems } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [slotInfo, systems] = await Promise.all([
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getAvailable(),
	]);

	if (slotInfo.available <= 0) redirect(302, '/characters');

	// Pre-load first system's classes/species for the form
	const systemDetails = systems.length
		? await gameSystems.getById(systems[0].id)
		: null;

	return { slotInfo, systems, systemDetails };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data         = await request.formData();
		const name         = data.get('name')?.toString().trim()         ?? '';
		const gameSystemId = data.get('gameSystemId')?.toString()         ?? '';
		const speciesId    = data.get('speciesId')?.toString()            ?? '';
		const avatarUrl    = data.get('avatarUrl')?.toString().trim()     ?? '';
		const portraitUrl  = data.get('portraitUrl')?.toString().trim()   ?? '';
		const classesRaw   = data.get('classes')?.toString()              ?? '[]';

		if (!name)         return fail(400, { message: 'Name is required.', name, gameSystemId });
		if (!gameSystemId) return fail(400, { message: 'Game system is required.', name, gameSystemId });

		let classAllocations: { classId: string; subclassId: string | null; allocatedLevel: number }[] = [];
		try {
			classAllocations = JSON.parse(classesRaw);
		} catch {
			return fail(400, { message: 'Invalid class data.', name, gameSystemId });
		}

		// Filter out empty class selections
		const validClasses = classAllocations.filter(c => c.classId);

		try {
			const character = await characters.create({
				userId:       locals.user!.id,
				gameSystemId,
				name,
				speciesId:   speciesId   || undefined,
				avatarUrl:   avatarUrl   || undefined,
				portraitUrl: portraitUrl || undefined,
			}, locals.user!.id);

			// Set initial class allocations if provided
			if (validClasses.length > 0) {
				await characters.updateClasses(character.id, validClasses, locals.user!.id);
			}

			redirect(302, `/characters/${character.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message, name, gameSystemId });
			throw e;
		}
	},
};