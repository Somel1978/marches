// apps/admin/src/routes/(app)/characters/[id]/_sheets/dnd5e.actions.server.ts
import { fail } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';

export const adminDnd5eActions = {
	updateSheet: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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
			await dnd5e.updateFields(params.id, { speciesId, backgroundId }, locals.user!.id);
			if (classes.length) await dnd5e.updateClasses(params.id, classes, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addFeat: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.id, featId, { sourceClassId, sourceLevel, stat1, amount1, stat2, amount2, chosenSkills: chosenSkills.length ? chosenSkills : undefined, actorId: locals.user!.id });
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeFeat: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		const scores: any = {};
		for (const stat of ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA']) {
			scores[stat] = Number(data.get(stat) ?? 8);
		}
		try {
			await dnd5e.saveAbilityScores(params.id, scores, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	manualScoreAdjust: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data  = await request.formData();
		const stat  = data.get('stat')?.toString() ?? '';
		const delta = Number(data.get('delta') ?? 0);
		const note  = data.get('note')?.toString().trim() ?? 'Admin adjustment';
		if (!stat || !delta) return fail(400, { message: 'Stat and delta required.' });
		try {
			await dnd5e.manualScoreAdjustment(params.id, stat, delta, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveMood: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data  = await request.formData();
		const emoji = data.get('emoji')?.toString() ?? null;
		const text  = data.get('text')?.toString()  ?? null;
		try {
			await dnd5e.saveMood(params.id, emoji, text);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSkills: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data        = await request.formData();
		const skill       = data.get('skill')?.toString() ?? '';
		const proficiency = (data.get('proficiency')?.toString() ?? 'NONE') as 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT';
		if (!skill) return fail(400, { message: 'Skill required.' });
		try {
			if (proficiency === 'NONE') {
				await dnd5e.removeSkillGrantsBySource(params.id, 'dm-manual-' + skill);
			} else {
				const value = ({ 'HALF_PROFICIENT': 0.5, 'PROFICIENT': 1.0, 'EXPERT': 2.0 } as Record<string,number>)[proficiency] ?? 1.0;
				await dnd5e.upsertDmSkillGrant(params.id, skill, value);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveSavingThrow: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data      = await request.formData();
		const stat      = data.get('stat')?.toString() ?? '';
		const proficient = data.get('proficient') === 'true';
		if (!stat) return fail(400, { message: 'Stat required.' });
		try {
			if (proficient) {
				await dnd5e.addSavingThrowGrants(params.id, [{ stat, sourceType: 'Admin', sourceId: 'dm-manual-' + stat }]);
			} else {
				await dnd5e.removeSavingThrowsBySource(params.id, 'dm-manual-' + stat);
			}
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveDetails: async ({ params, request, locals }: any) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { dnd5e } = await import('@core/database');
		const data = await request.formData();
		try {
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
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};