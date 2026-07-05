// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/dnd5e.actions.server.ts
// DM direct-save actions — only available to DMs with canManage permission.
import { fail } from '@sveltejs/kit';
import { characters, db } from '@core/database';
import { isMarchesError } from '@core/errors';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const dmDnd5eActions = {
	updateSheet: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data         = await request.formData();
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;
		const classIds     = data.getAll('classId').map((v: any) => v.toString()).filter(Boolean);
		const subclassIds  = data.getAll('subclassId').map((v: any) => v.toString());
		const levels       = data.getAll('allocatedLevel').map((v: any) => Number(v));
		const classes      = classIds.map((classId: string, i: number) => ({
			classId, subclassId: subclassIds[i]?.trim() || null, allocatedLevel: levels[i] ?? 1,
		}));
		try {
			await dnd5e.updateFields(params.charId, { speciesId, backgroundId }, locals.user!.id);
			if (classes.length) await dnd5e.updateClasses(params.charId, classes, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},


	saveChoicePoolGrants: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const { isMarchesError } = await import('@core/errors');
		const data = await request.formData();
		const poolSkills         = data.getAll('poolSkill').map((v: any) => v.toString()).filter(Boolean);
		const poolSkillSources   = data.getAll('poolSkillSource').map((v: any) => v.toString());
		const poolSkillSourceIds = data.getAll('poolSkillSourceId').map((v: any) => v.toString());
		const poolSkillValues    = data.getAll('poolSkillValue').map((v: any) => parseFloat(v.toString()) || 1.0);
		const poolSaves          = data.getAll('poolSave').map((v: any) => v.toString()).filter(Boolean);
		const poolSaveSources    = data.getAll('poolSaveSource').map((v: any) => v.toString());
		const poolSaveSourceIds  = data.getAll('poolSaveSourceId').map((v: any) => v.toString());
		const poolDmgModTypes    = data.getAll('poolDmgModType').map((v: any) => v.toString()).filter(Boolean);
		const poolDmgModDamages  = data.getAll('poolDmgModDamage').map((v: any) => v.toString());
		const poolDmgModSources  = data.getAll('poolDmgModSource').map((v: any) => v.toString());
		const poolDmgModSourceIds = data.getAll('poolDmgModSourceId').map((v: any) => v.toString());
		const poolTools          = data.getAll('poolTool').map((v: any) => v.toString()).filter(Boolean);
		const poolToolSources    = data.getAll('poolToolSource').map((v: any) => v.toString());
		const poolToolSourceIds  = data.getAll('poolToolSourceId').map((v: any) => v.toString());
		const poolLanguages      = data.getAll('poolLanguage').map((v: any) => v.toString()).filter(Boolean);
		const poolLanguageSources   = data.getAll('poolLanguageSource').map((v: any) => v.toString());
		const poolLanguageSourceIds = data.getAll('poolLanguageSourceId').map((v: any) => v.toString());
		try {
			if (poolSkills.length) {
				await dnd5e.addSkillGrants(params.id, poolSkills.map((skill: string, i: number) => ({
					skill, value: poolSkillValues[i] ?? 1.0,
					sourceType: poolSkillSources[i] ?? 'PlayerChoice',
					sourceId:   poolSkillSourceIds[i] || undefined,
				})));
			}
			if (poolDmgModTypes.length) {
				await dnd5e.addDamageModifierGrants(params.id, poolDmgModTypes.map((modifierType: string, i: number) => ({
					modifierType,
					damageType:  poolDmgModDamages[i]   ?? '',
					sourceType:  poolDmgModSources[i]   ?? 'PlayerChoice',
					sourceId:    poolDmgModSourceIds[i] || undefined,
				})));
			}
			if (poolTools.length) {
				await dnd5e.addToolGrants(params.id, poolTools.map((tool: string, i: number) => ({
					tool,
					sourceType: poolToolSources[i]   ?? 'PlayerChoice',
					sourceId:   poolToolSourceIds[i] || undefined,
				})));
			}
			if (poolLanguages.length) {
				await dnd5e.addLanguageGrants(params.id, poolLanguages.map((language: string, i: number) => ({
					language,
					sourceType: poolLanguageSources[i]   ?? 'PlayerChoice',
					sourceId:   poolLanguageSourceIds[i] || undefined,
				})));
			}
			if (poolSaves.length) {
				await dnd5e.addSavingThrowGrants(params.id, poolSaves.map((stat: string, i: number) => ({
					stat, sourceType: poolSaveSources[i] ?? 'PlayerChoice', sourceId: poolSaveSourceIds[i] || undefined,
				})));
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addFeat: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data          = await request.formData();
		const featId        = data.get('featId')?.toString() ?? '';
		const sourceClassId = data.get('sourceClassId')?.toString() || undefined;
		const sourceLevel   = data.get('sourceLevel') ? Number(data.get('sourceLevel')) : undefined;
		const stat1         = data.get('stat1')?.toString()  || undefined;
		const amount1       = data.get('amount1') ? Number(data.get('amount1')) : undefined;
		const stat2         = data.get('stat2')?.toString()  || undefined;
		const amount2       = data.get('amount2') ? Number(data.get('amount2')) : undefined;
		const chosenSkills  = data.getAll('chosenSkill').map((v: FormDataEntryValue) => v.toString()).filter(Boolean);
		const chosenSaves   = data.getAll('chosenSave').map((v: FormDataEntryValue) => v.toString()).filter(Boolean);
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.charId, featId, { sourceClassId, sourceLevel, stat1, amount1, stat2, amount2, chosenSkills: chosenSkills.length ? chosenSkills : undefined });
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeFeat: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		try {
			await dnd5e.removeCharacterFeat(id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveAbilityScores: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const scores: any = {};
		for (const stat of ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA']) {
			scores[stat] = Number(data.get(stat) ?? 8);
		}
		try {
			await dnd5e.saveAbilityScores(params.charId, scores, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	manualScoreAdjust: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data  = await request.formData();
		const stat  = data.get('stat')?.toString() ?? '';
		const delta = Number(data.get('delta') ?? 0);
		const note  = data.get('note')?.toString().trim() ?? 'DM adjustment';
		if (!stat || !delta) return fail(400, { message: 'Stat and delta required.' });
		try {
			await dnd5e.manualScoreAdjustment(params.charId, stat, delta, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveMood: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data  = await request.formData();
		const emoji = data.get('emoji')?.toString() ?? null;
		const text  = data.get('text')?.toString()  ?? null;
		try {
			await dnd5e.saveMood(params.charId, emoji, text);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSkills: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data        = await request.formData();
		const skill       = data.get('skill')?.toString() ?? '';
		const proficiency = (data.get('proficiency')?.toString() ?? 'NONE') as 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT';
		const note        = data.get('note')?.toString().trim() || null;
		if (!skill) return fail(400, { message: 'Skill required.' });
		try {
			if (proficiency === 'NONE') {
				await dnd5e.removeOverrideSkillGrant(params.charId, skill);
			} else {
				const value = { 'HALF_PROFICIENT': 0.5, 'PROFICIENT': 1.0, 'EXPERT': 2.0 }[proficiency] ?? 1.0;
				await dnd5e.upsertOverrideSkillGrant(params.charId, skill, value, note);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSavingThrow: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data       = await request.formData();
		const stat       = data.get('stat')?.toString() ?? '';
		const proficient = data.get('proficient') === 'true';
		const action     = data.get('action')?.toString() ?? '';
		const note       = data.get('note')?.toString().trim() || null;
		if (!stat) return fail(400, { message: 'Stat required.' });
		try {
			if (action === 'clear') {
				await dnd5e.removeOverrideSavingThrowGrant(params.charId, stat);
			} else {
				await dnd5e.upsertOverrideSavingThrowGrant(params.charId, stat, proficient, note);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},


	saveTool: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data   = await request.formData();
		const tool   = data.get('tool')?.toString() ?? '';
		const action = data.get('action')?.toString() ?? '';
		const note   = data.get('note')?.toString().trim() || null;
		if (!tool) return fail(400, { message: 'Tool required.' });
		try {
			if (action === 'clear') {
				await dnd5e.removeOverrideToolGrant(params.id, tool);
			} else {
				await dnd5e.upsertOverrideToolGrant(params.id, tool, note);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveLanguage: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data     = await request.formData();
		const language = data.get('language')?.toString() ?? '';
		const action   = data.get('action')?.toString() ?? '';
		const note     = data.get('note')?.toString().trim() || null;
		if (!language) return fail(400, { message: 'Language required.' });
		try {
			if (action === 'clear') {
				await dnd5e.removeOverrideLanguageGrant(params.id, language);
			} else {
				await dnd5e.upsertOverrideLanguageGrant(params.id, language, note);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveDamageModifier: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data         = await request.formData();
		const modifierType = (data.get('modifierType')?.toString() ?? '') as 'RESISTANCE'|'IMMUNITY'|'VULNERABILITY';
		const damageType   = data.get('damageType')?.toString() ?? '';
		const action       = data.get('action')?.toString() ?? '';
		const note         = data.get('note')?.toString().trim() || null;
		if (!modifierType || !damageType) return fail(400, { message: 'modifierType and damageType required.' });
		try {
			if (action === 'clear') {
				await dnd5e.removeOverrideDamageModifier(params.id, modifierType, damageType);
			} else {
				await dnd5e.upsertOverrideDamageModifier(params.id, modifierType, damageType, note);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},


	saveSize: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const size = data.get('size')?.toString().trim() || null;
		await dnd5e.updateFields(params.id, { size }, locals.user!.id);
		return { success: true };
	},

	saveDetails: async ({ params, request, locals }: any) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		try {
			await dnd5e.saveDetails(params.charId, {
				alignment:         data.get('alignment')?.toString()         ?? null,
				personalityTraits: data.get('personalityTraits')?.toString() ?? null,
				ideals:            data.get('ideals')?.toString()            ?? null,
				bonds:             data.get('bonds')?.toString()             ?? null,
				flaws:             data.get('flaws')?.toString()             ?? null,
				appearance:        data.get('appearance')?.toString()        ?? null,
				age:               data.get('age') ? Number(data.get('age')) : null,
				height:            data.get('height')?.toString()            ?? null,
				weight:            data.get('weight')?.toString()            ?? null,
			});
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};