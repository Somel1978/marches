// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/calendar/+page.server.ts
import { fail, error } from '@sveltejs/kit';
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
	const calendar = await worlds.calendar.ensure(params.worldId);
	return { world, canManage, calendar };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const raw = data.get('payload')?.toString();
		if (!raw) return fail(400, { message: 'Missing calendar payload.' });
		try {
			const payload = JSON.parse(raw);
			await worlds.calendar.save(params.worldId, payload, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
