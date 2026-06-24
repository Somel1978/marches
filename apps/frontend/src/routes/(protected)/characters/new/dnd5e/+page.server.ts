// apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.server.ts
// D&D 5e 5-step wizard — loads system data, single create action at the end.
import { fail, redirect, error } from '@sveltejs/kit';
import { dnd5e, characters, gameSystems, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import { checkPermission } from '@core/rbac';
import { isAsiFeatureName } from '@core/database';
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
	// Show all active worlds — acceptsGlobalCharacters controls whether existing global characters
	// can sign up for quests, not whether new world-specific characters can be created.
	const activeWorlds = (allWorlds as any[]).filter((w: any) => w.isActive);

	const canViewDescriptions = checkPermission(locals.permissions, { resourceKey: 'dnd5eDescriptions', action: 'read' }).allowed;
	return { slotInfo, gameSystem: system, systemData, activeWorlds, canViewDescriptions };
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

			// Save ASI / Feat choices from the ASI step
			// Each slot is submitted as parallel arrays of asi_* fields
			const asiSourceClassIds = data.getAll('asi_sourceClassId').map(v => v.toString());
			const asiSourceLevels   = data.getAll('asi_sourceLevel').map(v => Number(v));
			const asiTypes          = data.getAll('asi_type').map(v => v.toString());
			const asiModes          = data.getAll('asi_mode').map(v => v.toString());
			const asiStat1s         = data.getAll('asi_stat1').map(v => v.toString());
			const asiAmount1s       = data.getAll('asi_amount1').map(v => Number(v));
			const asiStat2s         = data.getAll('asi_stat2').map(v => v.toString());
			const asiAmount2s       = data.getAll('asi_amount2').map(v => Number(v));
			const asiFeatIds        = data.getAll('asi_featId').map(v => v.toString());

			// Look up ASI feat ID once if any stat-mode choices exist
			let asiFeatId: string | null = null;
			let systemFeats: any[] = [];
			if (asiModes.some(m => m === 'stat') || asiFeatIds.some(id => id)) {
				const systemData = await dnd5e.getSystemData(gameSystemId);
				systemFeats = systemData.feats as any[];
				asiFeatId = systemFeats.find(f => isAsiFeatureName(f.name))?.id ?? null;
			}

			for (let i = 0; i < asiSourceClassIds.length; i++) {
				const sourceClassId = asiSourceClassIds[i];
				const sourceLevel   = asiSourceLevels[i];
				const type          = asiTypes[i];
				const mode          = asiModes[i];
				const featId        = asiFeatIds[i];

				if (type === 'epic_boon' || mode === 'feat') {
					if (!featId) continue;
					// Check if this feat grants an ASI — pass the chosen stat/amount if so
					const featDef   = systemFeats.find((f: any) => f.id === featId);
					const asiAmount = featDef?.asiAmount ?? null;
					const stat1     = asiStat1s[i]  || undefined;
					const amount1   = asiAmount ? (stat1 ? asiAmount : undefined) : undefined;
					await dnd5e.addCharacterFeat(character.id, featId, {
						sourceClassId, sourceLevel,
						...(amount1 && stat1 ? { stat1, amount1 } : {}),
					});
				} else if (mode === 'stat' && asiFeatId) {
					const stat1   = asiStat1s[i]  || undefined;
					const amount1 = asiAmount1s[i] || undefined;
					const stat2   = asiStat2s[i]  || undefined;
					const amount2 = asiAmount2s[i] || undefined;
					await dnd5e.addCharacterFeat(character.id, asiFeatId, {
						sourceClassId, sourceLevel, stat1, amount1, stat2, amount2,
					});
				}
			}

			// Save skill proficiencies from the Skills step using grant log
			const chosenClassSkills = data.getAll('chosenClassSkill').map(v => v.toString()).filter(Boolean);
			const autoSkillSources  = data.getAll('autoSkillSource').map(v => v.toString());
			const autoSkills        = data.getAll('autoSkill').map(v => v.toString()).filter(Boolean);

			const allSkillGrants: { skill: string; value: number; sourceType: string; sourceId?: string }[] = [];
			for (const s of chosenClassSkills) allSkillGrants.push({ skill: s, value: 1.0, sourceType: 'PlayerChoice' });
			for (let i = 0; i < autoSkills.length; i++) {
				allSkillGrants.push({ skill: autoSkills[i], value: 1.0, sourceType: autoSkillSources[i] ?? 'Background' });
			}
			if (allSkillGrants.length) await dnd5e.addSkillGrants(character.id, allSkillGrants);

			// Save saving throw proficiencies from class
			const classSaves = data.getAll('classSave').map(v => v.toString()).filter(Boolean);
			if (classSaves.length) {
				await dnd5e.addSavingThrowGrants(character.id, classSaves.map(stat => ({
					stat, sourceType: 'Class', sourceId: null,
				})));
			}

			redirect(302, '/characters');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};