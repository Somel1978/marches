// apps/frontend/src/routes/(protected)/characters/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { dnd5e, characters, gameSystems, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [slotInfo, systems, allWorlds] = await Promise.all([
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getActive(),
		worlds.getAll(),
	]);

	if (slotInfo.available <= 0) redirect(302, '/characters');

	const firstSystem   = systems[0] ?? null;
	const systemDetails = firstSystem ? await gameSystems.getById(firstSystem.id) : null;
	const systemData    = firstSystem ? await dnd5e.getSystemData(firstSystem.id)  : null;

	const activeWorlds = (allWorlds as any[]).filter((w: any) => w.isActive && w.acceptsGlobalCharacters);
	return { slotInfo, systems, systemDetails, systemData, activeWorlds, gameSystem: firstSystem };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data         = await request.formData();
		const gameSystemId = data.get('gameSystemId')?.toString() ?? '';
		const name         = data.get('name')?.toString().trim()  ?? '';
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;
		const description  = data.get('description')?.toString().trim() || undefined;
		const avatarUrl    = data.get('avatarUrl')?.toString().trim()   || undefined;
		const worldId      = data.get('worldId')?.toString() || undefined;

		// Parse classes
		const classIds     = data.getAll('classId').map(v => v.toString()).filter(Boolean);
		const subclassIds  = data.getAll('subclassId').map(v => v.toString());
		const levels       = data.getAll('allocatedLevel').map(v => Number(v));

		const classes = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i] || null,
			allocatedLevel: levels[i] ?? 1,
		}));

		if (!name)         return fail(400, { message: 'Name is required.' });
		if (!speciesId)    return fail(400, { message: 'Species is required.' });
		if (!backgroundId) return fail(400, { message: 'Background is required.' });
		if (!classes.length) return fail(400, { message: 'At least one class is required.' });

		try {
			// Use dnd5e.createCharacter for dnd5e — universal characters.create for other systems
			await dnd5e.createCharacter({
				userId:       locals.user!.id,
				gameSystemId,
				name,
				speciesId:    speciesId!,
				backgroundId: backgroundId!,
				classes,
				description,
				avatarUrl,
				worldId,
			});
			redirect(302, '/characters');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};