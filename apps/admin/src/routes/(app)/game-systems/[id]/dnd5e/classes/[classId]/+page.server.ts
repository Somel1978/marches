// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/[classId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';


function grantFields(data: FormData) {
	// Returns undefined (not null) so it works for both create (string|undefined)
	// and update (string|null|undefined) signatures.
	const s = (k: string) => data.get(k)?.toString().trim() || undefined;
	const n = (k: string) => data.get(k) ? Number(data.get(k)) : undefined;
	return {
		grantsSkills:           s('grantsSkills'),
		grantsExpertise:        s('grantsExpertise'),
		grantsHalfSkills:       s('grantsHalfSkills'),
		grantsSavingThrows:     s('grantsSavingThrows'),
		skillChoiceCount:       n('skillChoiceCount'),
		skillChoicePool:        s('skillChoicePool'),
		savingThrowChoiceCount: n('savingThrowChoiceCount'),
		savingThrowChoicePool:  s('savingThrowChoicePool'),
		grantsTools:            s('grantsTools'),
		toolChoiceCount:        n('toolChoiceCount'),
		toolChoicePool:         s('toolChoicePool'),
		grantsLanguages:        s('grantsLanguages'),
		languageChoiceCount:    n('languageChoiceCount'),
		languageChoicePool:     s('languageChoicePool'),
		grantsResistances:      s('grantsResistances'),
		grantsImmunities:       s('grantsImmunities'),
		grantsVulnerabilities:  s('grantsVulnerabilities'),
		grantsInnateSpells:     s('grantsInnateSpells'),
		grantsSpeed:            s('grantsSpeed'),
		grantsSenses:           s('grantsSenses'),
	};
}
export const load: PageServerLoad = async ({ params }) => {
	const system     = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classData  = await dnd5e.classes.getById(params.classId);
	if (!classData) throw error(404, 'Class not found');
	return { system, classData };
};

export const actions: Actions = {
	updateClass: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await dnd5e.classes.update(params.classId, {
				name:                data.get('name')?.toString().trim()                   ?? '',
				description:         data.get('description')?.toString().trim()            || undefined,
				source:              data.get('source')?.toString().trim()                 || undefined,
				link:                data.get('link')?.toString().trim()                   || undefined,
				hitDice:             Number(data.get('hitDice') ?? 0)                      || null,
				canCastSpells:       data.get('canCastSpells') === 'true',
				primaryAbilities:    data.get('primaryAbilities')?.toString().trim()       || undefined,
				equipmentDescription: data.get('equipmentDescription')?.toString().trim()  || undefined,
				isAvailable:         data.get('isAvailable') === 'true',
				sortOrder:           Number(data.get('sortOrder') ?? 0),
				skillChoiceCount:    data.get('skillChoiceCount') ? Number(data.get('skillChoiceCount')) : undefined,
			}, locals.user!.id);
			// Junction: saving throws
			const saveStats = (data.get('grantsSavingThrows')?.toString().trim() ?? '')
				.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
			await dnd5e.classes.updateSavingThrows(params.classId, saveStats);
			// Junction: skill pool
			const skillPool = (data.get('skillPool')?.toString().trim() ?? '')
				.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
			await dnd5e.classes.updateSkillPool(params.classId, skillPool);
			dnd5e.invalidateSystemCache(params.id);
			return { success: true, action: 'class' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addFeature: async ({ params, request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const level = Number(data.get('requiredLevel') ?? 1);
		if (!name) return fail(400, { message: 'Name required.' });
		await dnd5e.classFeatures.create({ classId: params.classId, name, description: data.get('description')?.toString().trim() || undefined, requiredLevel: level, url: data.get('url')?.toString().trim() || undefined, ...grantFields(data) }, locals.user!.id);
		return { success: true, action: 'feature' };
	},

	deleteFeature: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.classFeatures.delete(data.get('id')?.toString() ?? '');
		return { success: true };
	},

	updateFeature: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await dnd5e.classFeatures.update(id, {
			name:          data.get('name')?.toString().trim()        ?? '',
			description:   data.get('description')?.toString().trim() || undefined,
			requiredLevel: Number(data.get('requiredLevel') ?? 1),
			url:           data.get('url')?.toString().trim()         || undefined,
			...grantFields(data),
		});
		return { success: true, action: 'feature' };
	},

	addSubclass: async ({ params, request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		await dnd5e.subclasses.create({ classId: params.classId, name, description: data.get('description')?.toString().trim() || undefined }, locals.user!.id);
		return { success: true, action: 'subclass' };
	},

	toggleSubclassCasting: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data         = await request.formData();
		const id           = data.get('id')?.toString() ?? '';
		const canCastSpells = data.get('canCastSpells') === 'true';
		await dnd5e.subclasses.updateSpellcasting(id, { canCastSpells });
		return { success: true };
	},

	deleteSubclass: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.subclasses.delete(data.get('id')?.toString() ?? '');
		return { success: true };
	},

	addSubclassFeature: async ({ request, locals }) => {
		const data       = await request.formData();
		const subclassId = data.get('subclassId')?.toString() ?? '';
		const name       = data.get('name')?.toString().trim() ?? '';
		const level      = Number(data.get('requiredLevel') ?? 1);
		if (!name) return fail(400, { message: 'Name required.' });
		await dnd5e.subclassFeatures.create({ subclassId, name, description: data.get('description')?.toString().trim() || undefined, requiredLevel: level, url: data.get('url')?.toString().trim() || undefined, ...grantFields(data) });
		return { success: true, action: 'subclassFeature' };
	},

	deleteSubclassFeature: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.subclassFeatures.delete(data.get('id')?.toString() ?? '');
		return { success: true };
	},

	updateSubclassFeature: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await dnd5e.subclassFeatures.update(id, {
			name:          data.get('name')?.toString().trim()        ?? '',
			description:   data.get('description')?.toString().trim() || undefined,
			requiredLevel: Number(data.get('requiredLevel') ?? 1),
			url:           data.get('url')?.toString().trim()         || undefined,
			...grantFields(data),
		});
		return { success: true, action: 'subclassFeature' };
	},

	deleteClass: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		await dnd5e.classes.delete(params.classId, locals.user!.id);
		return { deleted: true };
	},
};