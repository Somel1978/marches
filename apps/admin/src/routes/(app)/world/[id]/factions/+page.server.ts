//apps/admin/src/routes/(app)/world/[id]/factions/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { factions, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');

	const factionList = await factions.getByWorld(params.id);
	return { world, factions: factionList };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name is required.' });

		let faction;
		try {
			faction = await factions.create(params.id, { name }, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/world/${params.id}/factions/${faction.id}`);
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const factionId = data.get('factionId')?.toString() ?? '';
		if (!factionId) return fail(400, { message: 'Faction required.' });

		try {
			await factions.delete(factionId, locals.user!.id);
			return { deleteSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
