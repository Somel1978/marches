// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/known/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const system  = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classes = await dnd5e.classes.getAll(params.id);

	const sources: { id: string; label: string; classId: string; className: string; subclassId: string; subclassName: string }[] = [];
	for (const cls of classes) {
		if ((cls as any).canCastSpells) {
			sources.push({ id: cls.id, label: cls.name, classId: cls.id, className: cls.name, subclassId: '', subclassName: '' });
		}
		for (const sub of ((cls as any).subclasses ?? [])) {
			if (sub.canCastSpells) {
				sources.push({ id: sub.id, label: `${cls.name} — ${sub.name}`, classId: cls.id, className: cls.name, subclassId: sub.id, subclassName: sub.name });
			}
		}
	}

	const sourceId = url.searchParams.get('sourceId') ?? sources[0]?.id ?? '';
	const source   = sources.find(s => s.id === sourceId);
	const rows     = source ? await dnd5e.spellsKnown.getByClass(params.id, source.classId).then(r => r.filter((x: any) => x.subclassId === source.subclassId)) : [];

	return { system, sources, sourceId, source, rows };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const classId     = data.get('classId')?.toString()      ?? '';
		const className   = data.get('className')?.toString()    ?? '';
		const subclassId  = data.get('subclassId')?.toString()   ?? '';
		const subclassName = data.get('subclassName')?.toString() ?? '';
		if (!classId || !className) return fail(400, { message: 'Class required.' });

		const gn = (k: string) => { const v = data.get(k)?.toString().trim(); return v !== '' && v != null ? Number(v) : null; };
		const gs = (k: string) => data.get(k)?.toString().trim() || null;

		for (let lvl = 1; lvl <= 20; lvl++) {
			await dnd5e.spellsKnown.upsert({
				gameSystemId: params.id,
				classId, className, subclassId, subclassName,
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