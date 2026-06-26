// apps/frontend/src/routes/(protected)/characters/[id]/_sheets/dnd5e.actions.server.ts
// All dnd5e-specific form actions. Called from +page.server.ts when gameSystem.slug === 'dnd5e'.
import { fail } from '@sveltejs/kit';
import { characters, db } from '@core/database';
import { isMarchesError } from '@core/errors';

export const dnd5eActions = {
	submitChanges: async ({ params, request, locals }: any) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (!['ACTIVE', 'RESTING', 'REJECTED'].includes(character.status))
			return fail(400, { message: 'Cannot edit a character that is pending approval.' });
		const { dnd5e } = await import('@core/database');
		const data        = await request.formData();
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;
		const classIds    = data.getAll('classId').map((v: any) => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map((v: any) => v.toString());
		const levels      = data.getAll('allocatedLevel').map((v: any) => Number(v));
		const classes     = classIds.map((classId: string, i: number) => ({
			classId, subclassId: subclassIds[i]?.trim() || null, allocatedLevel: levels[i] ?? 1,
		}));
		try {
			if (character.status === 'REJECTED') {
				await dnd5e.updateFields(params.id, { speciesId, backgroundId }, locals.user!.id);
				if (classes.length) await dnd5e.updateClasses(params.id, classes, locals.user!.id);
			} else {
				await dnd5e.submitChanges(params.id, { speciesId, backgroundId, classes }, locals.user!.id);
			}
			return { changesSubmitted: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	submitLevelUp: async ({ params, request, locals }: any) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (!['ACTIVE','RESTING','PENDING'].includes(character.status))
			return fail(400, { message: 'Cannot submit level-up at this time.' });
		const { dnd5e } = await import('@core/database');
		const thresholds = await db.progressionThreshold.findMany({
			where: { gameSystemId: character.gameSystemId }, orderBy: { xpRequired: 'asc' },
		});
		const earnedLevel = thresholds.filter((t: any) => (character.totalXp ?? 0) >= t.xpRequired).length;
		const data        = await request.formData();
		const classIds    = data.getAll('classId').map((v: any) => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map((v: any) => v.toString());
		const levels      = data.getAll('allocatedLevel').map((v: any) => Number(v));
		const classes     = classIds.map((classId: string, i: number) => ({
			classId, subclassId: subclassIds[i]?.trim() || null, allocatedLevel: levels[i] ?? 1,
		}));
		if (!classes.length) return fail(400, { message: 'No class data provided.' });
		const submittedTotal = classes.reduce((s: number, c: any) => s + c.allocatedLevel, 0);
		if (submittedTotal !== earnedLevel)
			return fail(400, { message: `Your class levels must total exactly ${earnedLevel}. You submitted ${submittedTotal}.` });
		try {
			await dnd5e.submitChanges(params.id, { classes }, locals.user!.id);
			return { levelUpSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveChoicePoolGrants: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data = await request.formData();
		const poolSkills         = data.getAll('poolSkill').map((v: any) => v.toString()).filter(Boolean);
		const poolSkillSources   = data.getAll('poolSkillSource').map((v: any) => v.toString());
		const poolSkillSourceIds = data.getAll('poolSkillSourceId').map((v: any) => v.toString());
		const poolSkillValues    = data.getAll('poolSkillValue').map((v: any) => parseFloat(v.toString()) || 1.0);
		const poolSaves          = data.getAll('poolSave').map((v: any) => v.toString()).filter(Boolean);
		const poolSaveSources    = data.getAll('poolSaveSource').map((v: any) => v.toString());
		const poolSaveSourceIds  = data.getAll('poolSaveSourceId').map((v: any) => v.toString());
		try {
			if (poolSkills.length) {
				await dnd5e.addSkillGrants(params.id, poolSkills.map((skill: string, i: number) => ({
					skill,
					value:      poolSkillValues[i] ?? 1.0,
					sourceType: poolSkillSources[i]   ?? 'PlayerChoice',
					sourceId:   poolSkillSourceIds[i] || undefined,
				})));
			}
			if (poolSaves.length) {
				await dnd5e.addSavingThrowGrants(params.id, poolSaves.map((stat: string, i: number) => ({
					stat,
					sourceType: poolSaveSources[i]   ?? 'PlayerChoice',
					sourceId:   poolSaveSourceIds[i] || undefined,
				})));
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addFeat: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const data          = await request.formData();
		const featId        = data.get('featId')?.toString() ?? '';
		const sourceClassId = data.get('sourceClassId')?.toString() || undefined;
		const sourceLevel   = data.get('sourceLevel') ? Number(data.get('sourceLevel')) : undefined;
		const stat1         = data.get('stat1')?.toString()   || undefined;
		const amount1       = data.get('amount1') ? Number(data.get('amount1')) : undefined;
		const stat2         = data.get('stat2')?.toString()   || undefined;
		const amount2       = data.get('amount2') ? Number(data.get('amount2')) : undefined;
		const chosenSkills  = data.getAll('chosenSkill').map((v: FormDataEntryValue) => v.toString()).filter(Boolean);
		const chosenSaves   = data.getAll('chosenSave').map((v: FormDataEntryValue) => v.toString()).filter(Boolean);
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.id, featId, {
				sourceClassId, sourceLevel, stat1, amount1, stat2, amount2,
				chosenSkills: chosenSkills.length ? chosenSkills : undefined,
				chosenSaves:  chosenSaves.length  ? chosenSaves  : undefined,
				actorId: locals.user!.id,
			});
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeFeat: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		try {
			await dnd5e.removeCharacterFeat(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveAbilityScores: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const scores = {
			STRENGTH:     Number(data.get('STRENGTH')     ?? 8),
			DEXTERITY:    Number(data.get('DEXTERITY')    ?? 8),
			CONSTITUTION: Number(data.get('CONSTITUTION') ?? 8),
			INTELLIGENCE: Number(data.get('INTELLIGENCE') ?? 8),
			WISDOM:       Number(data.get('WISDOM')       ?? 8),
			CHARISMA:     Number(data.get('CHARISMA')     ?? 8),
		};
		try {
			await dnd5e.saveAbilityScores(params.id, scores, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── Spellbooks ────────────────────────────────────────────────────────────

	createSpellbook: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data  = await request.formData();
		const name  = data.get('name')?.toString().trim() || 'Spellbook';
		const books = await dnd5e.spellbooks.getForCharacter(params.id);
		if (books.length >= 3) return fail(400, { message: 'Maximum 3 spellbooks per character.' });
		await dnd5e.spellbooks.create({ characterId: params.id, name });
		return { success: true };
	},

	renameSpellbook: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data = await request.formData();
		const id   = data.get('id')?.toString()   ?? '';
		const name = data.get('name')?.toString().trim() || 'Spellbook';
		if (!id) return fail(400, { message: 'ID required.' });
		await dnd5e.spellbooks.update(id, name);
		return { success: true };
	},

	deleteSpellbook: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		await dnd5e.spellbooks.delete(id);
		return { success: true };
	},

	addSpellbookEntry: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data        = await request.formData();
		const spellbookId = data.get('spellbookId')?.toString() ?? '';
		const spellId     = Number(data.get('spellId')  ?? 0);
		const classId     = data.get('classId')?.toString()     ?? '';
		const className   = data.get('className')?.toString()   ?? '';
		if (!spellbookId || !spellId || !classId) return fail(400, { message: 'Missing required fields.' });
		try {
			await dnd5e.spellbooks.addEntry({ spellbookId, spellId, classId, className });
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeSpellbookEntry: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		await dnd5e.spellbooks.removeEntry(id);
		return { success: true };
	},

	toggleSpellPrepared: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data     = await request.formData();
		const id       = data.get('id')?.toString() ?? '';
		const prepared = data.get('prepared') === 'true';
		if (!id) return fail(400, { message: 'ID required.' });
		await dnd5e.spellbooks.togglePrepared(id, prepared);
		return { success: true };
	},

	saveMood: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data  = await request.formData();
		const emoji = data.get('emoji')?.toString() ?? null;
		const text  = data.get('text')?.toString()  ?? null;
		await dnd5e.saveMood(params.id, emoji, text);
		return { success: true };
	},

	saveSkills: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data       = await request.formData();
		const skill      = data.get('skill')?.toString() ?? '';
		const proficiency = (data.get('proficiency')?.toString() ?? 'NONE') as 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT';
		const note       = data.get('note')?.toString().trim() || null;
		if (!skill) return fail(400, { message: 'Skill required.' });
		if (proficiency === 'NONE') {
			await dnd5e.removeOverrideSkillGrant(params.id, skill);
		} else {
			const value = { 'HALF_PROFICIENT': 0.5, 'PROFICIENT': 1.0, 'EXPERT': 2.0 }[proficiency] ?? 1.0;
			await dnd5e.upsertOverrideSkillGrant(params.id, skill, value, note);
		}
		return { success: true };
	},

	saveSavingThrow: async ({ params, request, locals }: any) => {
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data       = await request.formData();
		const stat       = data.get('stat')?.toString() ?? '';
		const proficient = data.get('proficient') === 'true';
		const action     = data.get('action')?.toString() ?? '';  // 'set' or 'clear'
		const note       = data.get('note')?.toString().trim() || null;
		if (!stat) return fail(400, { message: 'Stat required.' });
		if (action === 'clear') {
			await dnd5e.removeOverrideSavingThrowGrant(params.id, stat);
		} else {
			await dnd5e.upsertOverrideSavingThrowGrant(params.id, stat, proficient, note);
		}
		return { success: true };
	},


	saveTool: async ({ params, request, locals }: any) => {
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
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
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
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
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
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
		const { dnd5e } = await import('@core/database');
		const character = await characters.getById(params.id);
		if (!character || character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data = await request.formData();
		await dnd5e.saveDetails(params.id, {
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
	},
};