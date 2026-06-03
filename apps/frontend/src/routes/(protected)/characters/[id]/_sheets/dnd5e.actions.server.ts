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
		if (!featId) return fail(400, { message: 'Feat ID required.' });
		try {
			await dnd5e.addCharacterFeat(params.id, featId, { sourceClassId, sourceLevel, stat1, amount1, stat2, amount2 });
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeFeat: async ({ params, request }: any) => {
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

	saveAbilityScores: async ({ params, request }: any) => {
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
			await dnd5e.saveAbilityScores(params.id, scores);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};