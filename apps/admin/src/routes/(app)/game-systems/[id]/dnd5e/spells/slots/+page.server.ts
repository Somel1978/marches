// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/slots/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const system   = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classes  = await dnd5e.classes.getAll(params.id);
	const classId  = url.searchParams.get('classId') ?? classes.find((c: any) => c.canCastSpells)?.id ?? '';
	const rows     = classId ? await dnd5e.spellSlots.getByClass(params.id, classId) : [];
	return { system, classes, classId, rows };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const classId   = data.get('classId')?.toString() ?? '';
		const className = data.get('className')?.toString() ?? '';
		const casterType = data.get('casterType')?.toString() ?? '';
		if (!classId || !className || !casterType) return fail(400, { message: 'Class and caster type required.' });

		for (let lvl = 1; lvl <= 20; lvl++) {
			await dnd5e.spellSlots.upsert({
				gameSystemId: params.id,
				classId,
				className,
				casterType,
				classLevel: lvl,
				slot1: Number(data.get(`slot1_${lvl}`) ?? 0),
				slot2: Number(data.get(`slot2_${lvl}`) ?? 0),
				slot3: Number(data.get(`slot3_${lvl}`) ?? 0),
				slot4: Number(data.get(`slot4_${lvl}`) ?? 0),
				slot5: Number(data.get(`slot5_${lvl}`) ?? 0),
				slot6: Number(data.get(`slot6_${lvl}`) ?? 0),
				slot7: Number(data.get(`slot7_${lvl}`) ?? 0),
				slot8: Number(data.get(`slot8_${lvl}`) ?? 0),
				slot9: Number(data.get(`slot9_${lvl}`) ?? 0),
			});
		}
		return { success: true };
	},
};
