// apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.server.ts
// D&D 5e 5-step wizard — loads system data, single create action at the end.
import { fail, redirect, error } from '@sveltejs/kit';
import { dnd5e, characters, gameSystems, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const STATS = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const [slotInfo, systems, allWorlds] = await Promise.all([
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getActive(),
		worlds.getAll(),
	]);

	if (slotInfo.available <= 0) redirect(302, '/characters');

	const system = (systems as any[]).find((s: any) => s.slug === 'dnd5e');
	if (!system) throw error(404, 'D&D 5e game system not available.');

	const systemData   = await dnd5e.getSystemData(system.id);
	const activeWorlds = (allWorlds as any[]).filter((w: any) => w.isActive && w.acceptsGlobalCharacters);

	return { slotInfo, gameSystem: system, systemData, activeWorlds };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data         = await request.formData();
		const gameSystemId = data.get('gameSystemId')?.toString() ?? '';
		const name         = data.get('name')?.toString().trim()  ?? '';
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;
		const avatarUrl    = data.get('avatarUrl')?.toString().trim()   || undefined;
		const portraitUrl  = data.get('portraitUrl')?.toString().trim() || undefined;
		const worldId      = data.get('worldId')?.toString() || undefined;
		const bgFeatPick   = data.get('bgFeatPick')?.toString() || undefined;

		// Classes
		const classIds    = data.getAll('classId').map(v => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map(v => v.toString());
		const levels      = data.getAll('allocatedLevel').map(v => Number(v));
		const classes     = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i] || null,
			allocatedLevel: levels[i] ?? 1,
		}));

		// Ability scores
		const scores: Record<string, number> = {};
		for (const stat of STATS) scores[stat] = Number(data.get(`score_${stat}`) ?? 8);

		// Validation
		if (!name)           return fail(400, { message: 'Name is required.' });
		if (!speciesId)      return fail(400, { message: 'Species is required.' });
		if (!backgroundId)   return fail(400, { message: 'Background is required.' });
		if (!classes.length) return fail(400, { message: 'At least one class is required.' });

		try {
			const character = await dnd5e.createCharacter({
				userId:       locals.user!.id,
				gameSystemId,
				name,
				speciesId:    speciesId!,
				backgroundId: backgroundId!,
				classes,
				avatarUrl,
				portraitUrl,
				worldId,
			}, locals.user!.id);

			// Save ability scores (scores already include bonus points from client)
			await dnd5e.saveAbilityScores(character.id, scores as any);

			// If background grants a category feat and player picked one, save it
			if (bgFeatPick) {
				await dnd5e.addCharacterFeat(character.id, bgFeatPick, {
					sourceClassId: 'background',
					sourceLevel:   1,
				});
			}

			redirect(302, '/characters');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};