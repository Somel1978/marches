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
		const bgFeatPick     = data.get('bgFeatPick')?.toString()      || undefined;
		const bgGrantedFeatId = data.get('bgGrantedFeatId')?.toString() || undefined;

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

			// Save chosen size to character sheet if applicable
			const chosenSize = data.get('chosenSize')?.toString().trim() || null;
			if (chosenSize) {
				await dnd5e.updateFields(character.id, { size: chosenSize }, locals.user!.id);
			}

			// Save ability scores (scores already include bonus points from client)
			await dnd5e.saveAbilityScores(character.id, scores as any);

			// If background auto-grants a fixed feat, save it
			if (bgGrantedFeatId) {
				await dnd5e.addCharacterFeat(character.id, bgGrantedFeatId, {
					sourceClassId: 'background',
					sourceLevel:   1,
				});
			}

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
			const chosenClassSkills  = data.getAll('chosenClassSkill').map(v => v.toString()).filter(Boolean);
			const autoSkillSources   = data.getAll('autoSkillSource').map(v => v.toString());
			const autoSkillValues    = data.getAll('autoSkillValue').map(v => v.toString());
			const autoSkills         = data.getAll('autoSkill').map(v => v.toString()).filter(Boolean);
			const poolSkills            = data.getAll('poolSkill').map(v => v.toString()).filter(Boolean);
			const poolSkillSources      = data.getAll('poolSkillSource').map(v => v.toString());
			const poolSkillSourceIds    = data.getAll('poolSkillSourceId').map(v => v.toString());
			const expertisePoolSkills   = data.getAll('expertisePoolSkill').map(v => v.toString()).filter(Boolean);
			const expertisePoolTypes    = data.getAll('expertisePoolSourceType').map(v => v.toString());
			const expertisePoolIds      = data.getAll('expertisePoolSourceId').map(v => v.toString());

			const allSkillGrants: { skill: string; value: number; sourceType: string; sourceId?: string }[] = [];
			for (const s of chosenClassSkills) allSkillGrants.push({ skill: s, value: 1.0, sourceType: 'PlayerChoice' });
			for (let i = 0; i < autoSkills.length; i++) {
				const val = autoSkillValues[i] ? parseFloat(autoSkillValues[i]) : 1.0;
				allSkillGrants.push({ skill: autoSkills[i], value: isNaN(val) ? 1.0 : val, sourceType: autoSkillSources[i] ?? 'Background' });
			}
			for (let i = 0; i < poolSkills.length; i++) {
				allSkillGrants.push({ skill: poolSkills[i], value: 1.0, sourceType: poolSkillSources[i] ?? 'PlayerChoice', sourceId: poolSkillSourceIds[i] || undefined });
			}
			for (let i = 0; i < expertisePoolSkills.length; i++) {
				allSkillGrants.push({ skill: expertisePoolSkills[i], value: 2.0, sourceType: expertisePoolTypes[i] ?? 'PlayerChoice', sourceId: expertisePoolIds[i] || undefined });
			}
			if (allSkillGrants.length) await dnd5e.addSkillGrants(character.id, allSkillGrants);

			// Save saving throw proficiencies — each has its own sourceType and sourceId
			const classSaves       = data.getAll('classSave').map(v => v.toString()).filter(Boolean);
			const classSaveTypes   = data.getAll('classSaveSourceType').map(v => v.toString());
			const classSaveIds     = data.getAll('classSaveSourceId').map(v => v.toString());
			if (classSaves.length) {
				await dnd5e.addSavingThrowGrants(character.id, classSaves.map((stat, i) => ({
					stat,
					sourceType: classSaveTypes[i] || 'Class',
					sourceId:   classSaveIds[i]   || null,
				})));
			}

			// Save tool grants
			const autoTools           = data.getAll('autoTool').map(v => v.toString()).filter(Boolean);
			const autoToolSourceTypes = data.getAll('autoToolSourceType').map(v => v.toString());
			const autoToolSourceIds   = data.getAll('autoToolSourceId').map(v => v.toString());
			if (autoTools.length) {
				await dnd5e.addToolGrants(character.id, autoTools.map((tool, i) => ({
					tool,
					sourceType: autoToolSourceTypes[i] || 'Background',
					sourceId:   autoToolSourceIds[i]   || null,
				})));
			}

			// Save language grants
			const autoLangs           = data.getAll('autoLanguage').map(v => v.toString()).filter(Boolean);
			const autoLangSourceTypes = data.getAll('autoLanguageSourceType').map(v => v.toString());
			const autoLangSourceIds   = data.getAll('autoLanguageSourceId').map(v => v.toString());
			if (autoLangs.length) {
				await dnd5e.addLanguageGrants(character.id, autoLangs.map((language, i) => ({
					language,
					sourceType: autoLangSourceTypes[i] || 'Background',
					sourceId:   autoLangSourceIds[i]   || null,
				})));
			}

			// Save innate spell grants (background, species traits, feats — at creation)
			// One hidden input group per source: innateSpellRaw + innateSpellSourceType + innateSpellSourceId
			const innateRaws      = data.getAll('innateSpellRaw').map(v => v.toString()).filter(Boolean);
			const innateSourceTs  = data.getAll('innateSpellSourceType').map(v => v.toString());
			const innateSourceIds = data.getAll('innateSpellSourceId').map(v => v.toString());
			if (innateRaws.length) {
				const characterLevel = classes.reduce((s, c) => s + c.allocatedLevel, 0);
				for (let i = 0; i < innateRaws.length; i++) {
					const sourceId   = innateSourceIds[i] ?? '';
					const sourceType = innateSourceTs[i]  ?? 'Background';
					const grants = await dnd5e.parseAndFilterInnateSpells(
						innateRaws[i], character.gameSystemId, characterLevel, sourceType, sourceId,
					);
					if (grants.length) await dnd5e.addInnateSpellGrants(character.id, grants);
				}
			}

			// Save damage modifier grants
			const dmgModTypes       = data.getAll('dmgModType').map(v => v.toString()).filter(Boolean);
			const dmgModDamageTypes = data.getAll('dmgModDamageType').map(v => v.toString());
			const dmgModSourceTypes = data.getAll('dmgModSourceType').map(v => v.toString());
			const dmgModSourceIds   = data.getAll('dmgModSourceId').map(v => v.toString());
			if (dmgModTypes.length) {
				await dnd5e.addDamageModifierGrants(character.id, dmgModTypes.map((modifierType, i) => ({
					modifierType: modifierType as 'RESISTANCE' | 'IMMUNITY' | 'VULNERABILITY',
					damageType:   dmgModDamageTypes[i] || '',
					sourceType:   dmgModSourceTypes[i] || 'Background',
					sourceId:     dmgModSourceIds[i]   || null,
				})));
			}

			redirect(302, '/characters');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};