// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/npcs/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { factions, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const load: PageServerLoad = async ({ params, parent, url }) => {
	// Any assigned DM may view; mutations are gated by canManage.
	const { world, canManage } = await parent();

	const q         = url.searchParams.get('q')?.trim() ?? '';
	const factionId = url.searchParams.get('factionId') ?? '';

	const [npcs, factionList] = await Promise.all([
		factions.npcs.getByWorld(params.worldId, { q: q || undefined, factionId: factionId || undefined }),
		factions.getByWorld(params.worldId),
	]);

	return { world, canManage, npcs, factions: factionList, q, factionId };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name is required.' });
		let npc;
		try {
			npc = await factions.npcs.create(params.worldId, { name }, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/dm/worlds/${params.worldId}/npcs/${npc.id}`);
	},

	delete: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
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
