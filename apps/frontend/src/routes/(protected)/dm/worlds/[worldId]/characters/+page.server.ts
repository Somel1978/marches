// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, db } from '@core/database';
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
	const { canManage } = await parent();

	const status = url.searchParams.get('status') ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);

	const result = await characters.getAll({ worldId: params.worldId, status, page, perPage: 20 });

	return { ...result, status, canManage };
};

export const actions: Actions = {
	approve: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await characters.dispatchApprove(id, locals.user!.id);
			return { approveSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason is required.' });
		try {
			await characters.dispatchReject(id, note, locals.user!.id);
			return { rejectSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};