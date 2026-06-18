// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/slots/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const system  = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classes = await dnd5e.classes.getAll(params.id);

	// Build selector items: spellcasting classes + spellcasting subclasses
	const sources: { id: string; label: string; classId: string; className: string; subclassId: string; subclassName: string }[] = [];
	for (const cls of classes) {
		if ((cls as any).canCastSpells) {
			sources.push({ id: cls.id, label: cls.name, classId: cls.id, className: cls.name, subclassId: '', subclassName: '' });
		}
		for (const sub of ((cls as any).subclasses ?? [])) {
			// Only show subclass casters whose parent class does NOT cast spells
			if (sub.canCastSpells && !(cls as any).canCastSpells) {
				sources.push({ id: sub.id, label: `${cls.name} — ${sub.name}`, classId: cls.id, className: cls.name, subclassId: sub.id, subclassName: sub.name });
			}
		}
	}

	const sourceId   = url.searchParams.get('sourceId') ?? sources[0]?.id ?? '';
	const source     = sources.find(s => s.id === sourceId);
	const rows       = source ? await dnd5e.spellSlots.getByClass(params.id, source.classId).then(r => r.filter((x: any) => x.subclassId === source.subclassId)) : [];
	const knownRows  = source ? await dnd5e.spellsKnown.getByClass(params.id, source.classId).then(r => r.filter((x: any) => x.subclassId === source.subclassId)) : [];

	return { system, sources, sourceId, source, rows, knownRows };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const classId     = data.get('classId')?.toString()     ?? '';
		const className   = data.get('className')?.toString()   ?? '';
		const subclassId  = data.get('subclassId')?.toString()  ?? '';
		const subclassName = data.get('subclassName')?.toString() ?? '';
		const casterType  = data.get('casterType')?.toString()  ?? '';
		if (!classId || !className || !casterType) return fail(400, { message: 'Class and caster type required.' });

		for (let lvl = 1; lvl <= 20; lvl++) {
			// Save slots only — cantrips are managed on the Spells Known page
			await dnd5e.spellSlots.upsert({
				gameSystemId: params.id,
				classId, className, subclassId, subclassName, casterType,
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