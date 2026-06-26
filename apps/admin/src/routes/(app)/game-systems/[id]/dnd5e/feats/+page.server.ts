// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/feats/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';


function featGrantFields(data: FormData) {
	return {
		grantsSkills:       data.get('grantsSkills')?.toString().trim()       || null,
		grantsExpertise:    data.get('grantsExpertise')?.toString().trim()    || null,
		grantsHalfSkills:   data.get('grantsHalfSkills')?.toString().trim()   || null,
		grantsSavingThrows: data.get('grantsSavingThrows')?.toString().trim() || null,
		skillChoiceCount:   data.get('skillChoiceCount') ? Number(data.get('skillChoiceCount')) : null,
		skillChoicePool:    data.get('skillChoicePool')?.toString().trim()    || null,
		savingThrowChoiceCount: data.get('savingThrowChoiceCount') ? Number(data.get('savingThrowChoiceCount')) : null,
		savingThrowChoicePool:  data.get('savingThrowChoicePool')?.toString().trim()  || null,
		grantsTools:          data.get('grantsTools')?.toString().trim()          || null,
		toolChoiceCount:      data.get('toolChoiceCount') ? Number(data.get('toolChoiceCount')) : null,
		toolChoicePool:       data.get('toolChoicePool')?.toString().trim()       || null,
		grantsLanguages:      data.get('grantsLanguages')?.toString().trim()      || null,
		languageChoiceCount:  data.get('languageChoiceCount') ? Number(data.get('languageChoiceCount')) : null,
		languageChoicePool:   data.get('languageChoicePool')?.toString().trim()   || null,
		grantsResistances:    data.get('grantsResistances')?.toString().trim()    || null,
		grantsImmunities:     data.get('grantsImmunities')?.toString().trim()     || null,
		grantsVulnerabilities: data.get('grantsVulnerabilities')?.toString().trim() || null,
		grantsInnateSpells:    data.get('grantsInnateSpells')?.toString().trim()    || null,
	};
}
export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const feats  = await dnd5e.feats.getAllForAdmin(params.id);
	return { system, feats };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			await dnd5e.feats.create({
				gameSystemId:  params.id,
				name,
				description:   data.get('description')?.toString().trim()   || undefined,
				snippet:       data.get('snippet')?.toString().trim()        || undefined,
				repeatable:    data.get('repeatable') === 'true',
				categories:    data.get('categories')?.toString().trim()     || undefined,
				prerequisites: data.get('prerequisites')?.toString().trim()  || undefined,
				detailsUrl:    data.get('detailsUrl')?.toString().trim()     || undefined,
				isEpicBoon:    data.get('isEpicBoon') === 'true',
				isAvailable:   data.get('isAvailable') !== 'false',
				sortOrder:     Number(data.get('sortOrder') ?? 0),
				asiAmount:     data.get('asiAmount') ? Number(data.get('asiAmount')) : null,
				asiStatFixed:  data.get('asiStatFixed')?.toString()  || null,
				asiStatChoices: data.get('asiStatChoices')?.toString() || null,
				...featGrantFields(data),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	update: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		try {
			await dnd5e.feats.update(id, {
				name:          data.get('name')?.toString().trim()          || undefined,
				description:   data.get('description')?.toString().trim()   || undefined,
				snippet:       data.get('snippet')?.toString().trim()        || undefined,
				repeatable:    data.get('repeatable') === 'true',
				categories:    data.get('categories')?.toString().trim()     || undefined,
				prerequisites: data.get('prerequisites')?.toString().trim()  || undefined,
				detailsUrl:    data.get('detailsUrl')?.toString().trim()     || undefined,
				isEpicBoon:    data.get('isEpicBoon') === 'true',
				isAvailable:   data.get('isAvailable') !== 'false',
				sortOrder:     Number(data.get('sortOrder') ?? 0),
				asiAmount:     data.get('asiAmount') ? Number(data.get('asiAmount')) : null,
				asiStatFixed:  data.get('asiStatFixed')?.toString()  || null,
				asiStatChoices: data.get('asiStatChoices')?.toString() || null,
				...featGrantFields(data),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await dnd5e.feats.delete(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};