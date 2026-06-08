// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { news, db, worlds } from '@core/database';
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
	const { canManage } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');
	const [journals, world] = await Promise.all([
		news.worldJournals.getAll(params.worldId),
		db.world.findUnique({ where: { id: params.worldId }, select: { id: true, name: true } }),
	]);
	return { journals, canManage, world };
};

export const actions: Actions = {
	create: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			const j = await news.worldJournals.create(
				{ worldId: params.worldId, title: 'New Journal' },
				locals.user!.id,
			);
			redirect(302, `/dm/worlds/${params.worldId}/journal/${j.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};