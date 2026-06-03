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
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.id, featId, { sourceClassId, sourceLevel, stat1, amount1, stat2, amount2 });
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
			await dnd5e.removeCharacterFeat(id);
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
			await dnd5e.saveAbilityScores(params.id, scores);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
