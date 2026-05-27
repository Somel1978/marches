// apps/frontend/src/routes/(protected)/characters/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { dnd5e, characters, gameSystems } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [slotInfo, systems] = await Promise.all([
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getActive(),
	]);

	if (slotInfo.available <= 0) redirect(302, '/characters');

	const firstSystem   = systems[0] ?? null;
	const systemDetails = firstSystem ? await gameSystems.getById(firstSystem.id) : null;
	const systemData    = firstSystem ? await dnd5e.getSystemData(firstSystem.id)  : null;

	return { slotInfo, systems, systemDetails, systemData };
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