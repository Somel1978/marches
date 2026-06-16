// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/known/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const system  = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classes = await dnd5e.classes.getAll(params.id);
	const classId = url.searchParams.get('classId') ?? classes.find((c: any) => c.canCastSpells)?.id ?? '';
	const rows    = classId ? await dnd5e.spellsKnown.getByClass(params.id, classId) : [];
	return { system, classes, classId, rows };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const classId   = data.get('classId')?.toString() ?? '';
		const className = data.get('className')?.toString() ?? '';
		if (!classId || !className) return fail(400, { message: 'Class required.' });

		const gn = (k: string) => { const v = data.get(k)?.toString().trim(); return v !== '' && v != null ? Number(v) : null; };
		const gs = (k: string) => data.get(k)?.toString().trim() || null;

		for (let lvl = 1; lvl <= 20; lvl++) {
			await dnd5e.spellsKnown.upsert({
				gameSystemId: params.id,
				classId,
				className,
				classLevel:  lvl,
				cantrips:    gn(`cantrips_${lvl}`),
				prepared:    gn(`prepared_${lvl}`),
				additional:  gn(`additional_${lvl}`),
				note:        gs(`note_${lvl}`),
			});
		}
		return { success: true };
	},
};
