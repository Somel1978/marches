// apps/admin/src/routes/(app)/world/[id]/journal/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import { news, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');
	const journals = await news.worldJournals.getAll(params.id);
	return { world, journals };
};

export const actions: Actions = {
	create: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Journal', action: 'create' });
		if (!can.allowed) return { error: 'Forbidden' };
		const j = await news.worldJournals.create({ worldId: params.id, title: 'New Journal' }, locals.user!.id);
		redirect(302, `/world/${params.id}/journal/${j.id}`);
	},
};