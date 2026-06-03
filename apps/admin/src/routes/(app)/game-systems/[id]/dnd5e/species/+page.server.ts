// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/species/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system  = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const species = await dnd5e.species.getAll(params.id);
	return { system, species };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			await dnd5e.species.create({
				gameSystemId: params.id,
				name,
				description:  data.get('description')?.toString().trim() || undefined,
				isSubrace:    data.get('isSubrace') === 'true',
				isLegacy:     data.get('isLegacy')  === 'true',
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	addTrait: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.speciesTraits.create({
			speciesId:    data.get('speciesId')?.toString() ?? '',
			name:         data.get('name')?.toString().trim() ?? '',
			description:  data.get('description')?.toString().trim() || undefined,
			requiredLevel: Number(data.get('requiredLevel') ?? 0) || undefined,
		});
		return { success: true };
	},
	deleteTrait: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.speciesTraits.delete(data.get('id')?.toString() ?? '');
		return { success: true };
	},
	deleteSpecies: async ({ request, locals }) => {
		const data = await request.formData();
		await dnd5e.species.delete(data.get('id')?.toString() ?? '', locals.user!.id);
		return { success: true };
	},
};
