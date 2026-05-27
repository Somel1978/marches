// apps/admin/src/routes/(app)/game-systems/[id]/backgrounds/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system      = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const backgrounds = await dnd5e.backgrounds.getAll(params.id);
	return { system, backgrounds };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			await dnd5e.backgrounds.create({
				gameSystemId:       params.id,
				name,
				shortDescription:   data.get('shortDescription')?.toString().trim()   || undefined,
				featureName:        data.get('featureName')?.toString().trim()        || undefined,
				skillProficiencies: data.get('skillProficiencies')?.toString().trim() || undefined,
				toolProficiencies:  data.get('toolProficiencies')?.toString().trim()  || undefined,
				languages:          data.get('languages')?.toString().trim()          || undefined,
				url:                data.get('url')?.toString().trim()                || undefined,
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
