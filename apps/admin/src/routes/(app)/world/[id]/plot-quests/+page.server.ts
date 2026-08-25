// apps/admin/src/routes/(app)/world/[id]/plot-quests/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');
	const canEdit = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' }).allowed;
	const plotQuests = await worlds.plotQuests.listByWorld(params.id);
	return { world, canEdit, plotQuests };
};

export const actions: Actions = {
	create: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			const p = await worlds.plotQuests.create(params.id, { title: 'New plot quest' }, locals.user!.id);
			redirect(302, `/world/${params.id}/plot-quests/${p.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
