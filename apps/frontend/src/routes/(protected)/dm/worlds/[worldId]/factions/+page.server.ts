// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/factions/+page.server.ts
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

export const load: PageServerLoad = async ({ params, parent }) => {
	// Any assigned DM may view; mutations are gated by canManage.
	const { world, canManage } = await parent();
	const factionList = await factions.getByWorld(params.worldId);
	return { world, canManage, factions: factionList };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name is required.' });
		let faction;
		try {
			faction = await factions.create(params.worldId, { name }, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/dm/worlds/${params.worldId}/factions/${faction.id}`);
	},

	delete: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
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
