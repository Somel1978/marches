// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/backgrounds/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

function bgGrantFields(data: FormData) {
	return {
		skillChoiceCount:       data.get('skillChoiceCount') ? Number(data.get('skillChoiceCount')) : null,
		skillChoicePool:        data.get('skillChoicePool')?.toString().trim()       || null,
		savingThrowChoiceCount: data.get('savingThrowChoiceCount') ? Number(data.get('savingThrowChoiceCount')) : null,
		savingThrowChoicePool:  data.get('savingThrowChoicePool')?.toString().trim() || null,
		grantsTools:            data.get('grantsTools')?.toString().trim()           || null,
		toolChoiceCount:        data.get('toolChoiceCount') ? Number(data.get('toolChoiceCount')) : null,
		toolChoicePool:         data.get('toolChoicePool')?.toString().trim()        || null,
		grantsLanguages:        data.get('grantsLanguages')?.toString().trim()       || null,
		languageChoiceCount:    data.get('languageChoiceCount') ? Number(data.get('languageChoiceCount')) : null,
		languageChoicePool:     data.get('languageChoicePool')?.toString().trim()    || null,
		grantsResistances:      data.get('grantsResistances')?.toString().trim()     || null,
		grantsImmunities:       data.get('grantsImmunities')?.toString().trim()      || null,
		grantsVulnerabilities:  data.get('grantsVulnerabilities')?.toString().trim() || null,
		grantsInnateSpells:     data.get('grantsInnateSpells')?.toString().trim()    || null,
		grantsSpeed:            data.get('grantsSpeed')?.toString().trim()           || null,
		grantsSenses:           data.get('grantsSenses')?.toString().trim()          || null,
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const [backgrounds, feats] = await Promise.all([
		dnd5e.backgrounds.getAll(params.id),
		dnd5e.feats.getAll(params.id),
	]);
	return { system, backgrounds, feats };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			const skillArr = [data.get('skill1'), data.get('skill2')].map(v => v?.toString().trim()).filter(Boolean);
			await dnd5e.backgrounds.create({
				gameSystemId:       params.id,
				name,
				shortDescription:   data.get('shortDescription')?.toString().trim()   || undefined,
				featureName:        data.get('featureName')?.toString().trim()         || undefined,
				grantsFeatCategory: data.get('grantsFeatCategory')?.toString().trim()  || undefined,
				grantsFeatId:       data.get('grantsFeatId')?.toString().trim()        || undefined,
				grantsSkills:       skillArr.join(',') || undefined,
				url:                data.get('url')?.toString().trim()                 || undefined,
				// Legacy fields — populated from new grant fields if provided
				toolProficiencies:  data.get('grantsTools')?.toString().trim()         || undefined,
				languages:          data.get('grantsLanguages')?.toString().trim()     || undefined,
				...bgGrantFields(data),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateBackground: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		try {
			const skillArr = [data.get('skill1'), data.get('skill2')].map(v => v?.toString().trim()).filter(Boolean);
			await dnd5e.backgrounds.update(id, {
				name:               data.get('name')?.toString().trim()               || undefined,
				shortDescription:   data.get('shortDescription')?.toString().trim()   || undefined,
				featureName:        data.get('featureName')?.toString().trim()         || undefined,
				grantsFeatCategory: data.get('grantsFeatCategory')?.toString().trim()  || undefined,
				grantsFeatId:       data.get('grantsFeatId')?.toString().trim()        || undefined,
				grantsSkills:       skillArr.join(',') || null,
				url:                data.get('url')?.toString().trim()                 || undefined,
				isAvailable:        data.get('isAvailable') !== 'false',
				// Legacy fields kept in sync
				toolProficiencies:  data.get('grantsTools')?.toString().trim()         || null,
				languages:          data.get('grantsLanguages')?.toString().trim()     || null,
				...bgGrantFields(data),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteBackground: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.backgrounds.delete(data.get('id')?.toString() ?? '', locals.user!.id);
		return { success: true };
	},
};