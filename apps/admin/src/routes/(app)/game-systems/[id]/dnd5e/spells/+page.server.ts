// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const spells = await dnd5e.spells.getAll(params.id);
	return { system, spells };
};

export const actions: Actions = {
	delete: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = Number(data.get('id'));
		if (!id) return fail(400, { message: 'ID required.' });
		await dnd5e.spells.delete(id);
		return { success: true };
	},
};