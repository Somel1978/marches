// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/plot-quests/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { worlds, db } from '@core/database';
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
	const { canManage, world } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');
	const plotQuests = await worlds.plotQuests.listByWorld(params.worldId);
	return { world, canManage, plotQuests };
};

export const actions: Actions = {
	create: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			const p = await worlds.plotQuests.create(params.worldId, { title: 'New plot quest' }, locals.user!.id);
			redirect(302, `/dm/worlds/${params.worldId}/plot-quests/${p.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
