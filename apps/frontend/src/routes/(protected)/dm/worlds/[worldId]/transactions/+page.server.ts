// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

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
	// Any assigned DM can view transactions in their world
	await parent(); // layout already guards world assignment

	const status = url.searchParams.get('status') ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);

	const txData = await marketplace.transactions.getAll({
		worldId: params.worldId,
		status,
		page,
	});

	return { ...txData, status: status ?? null };
};

export const actions: Actions = {
	approve: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await marketplace.transactions.approve(id, locals.user!.id);
			return { success: true };
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
		if (!note) return fail(400, { message: 'Review note required.' });
		try {
			await marketplace.transactions.reject(id, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};