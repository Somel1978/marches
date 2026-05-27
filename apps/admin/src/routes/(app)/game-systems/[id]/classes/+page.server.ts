// apps/admin/src/routes/(app)/game-systems/[id]/classes/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system  = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const classes = await dnd5e.classes.getAll(params.id);
	return { system, classes };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			await dnd5e.classes.create({
				gameSystemId:        params.id,
				name,
				description:         data.get('description')?.toString().trim()         || undefined,
				hitDice:             Number(data.get('hitDice') ?? 0)                   || undefined,
				canCastSpells:       data.get('canCastSpells') === 'true',
				primaryAbilities:    data.get('primaryAbilities')?.toString().trim()    || undefined,
				equipmentDescription: data.get('equipmentDescription')?.toString().trim() || undefined,
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
