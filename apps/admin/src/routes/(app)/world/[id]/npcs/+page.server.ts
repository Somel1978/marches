// apps/admin/src/routes/(app)/world/[id]/npcs/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { factions, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');

	const q         = url.searchParams.get('q')?.trim() ?? '';
	const factionId = url.searchParams.get('factionId') ?? '';

	const [npcs, factionList] = await Promise.all([
		factions.npcs.getByWorld(params.id, { q: q || undefined, factionId: factionId || undefined }),
		factions.getByWorld(params.id),
	]);

	return { world, npcs, factions: factionList, q, factionId };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name is required.' });

		let npc;
		try {
			npc = await factions.npcs.create(params.id, { name }, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/world/${params.id}/npcs/${npc.id}`);
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data  = await request.formData();
		const npcId = data.get('npcId')?.toString() ?? '';
		if (!npcId) return fail(400, { message: 'NPC required.' });

		try {
			await factions.npcs.delete(npcId, locals.user!.id);
			return { deleteSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
