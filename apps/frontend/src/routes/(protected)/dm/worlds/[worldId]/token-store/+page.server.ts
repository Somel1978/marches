// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/token-store/+page.server.ts
import { fail } from '@sveltejs/kit';
import { tokenStore, db } from '@core/database';
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

export const load: PageServerLoad = async ({ params, locals }) => {
	const canManage = await assertCanManage(params.worldId, locals.user!.id);
	const txs = await tokenStore.transactions.getAll({ worldId: params.worldId });
	return { txs, canManage };
};

export const actions: Actions = {
	approve: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		try {
			await tokenStore.transactions.approve(id, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	reject: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString()         ?? '';
		const note = data.get('reviewNote')?.toString() ?? '';
		try {
			await tokenStore.transactions.reject(id, note, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	recalculate: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		try {
			const result = await tokenStore.transactions.recalculate(id, locals.user!.id);
			return { success: true, message: (result as any).message };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};