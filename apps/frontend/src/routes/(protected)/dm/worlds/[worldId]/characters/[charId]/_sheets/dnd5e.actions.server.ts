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
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.charId, featId, { sourceClassId, sourceLevel, stat1, amount1, stat2, amount2 });
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
			await dnd5e.saveAbilityScores(params.charId, scores);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
