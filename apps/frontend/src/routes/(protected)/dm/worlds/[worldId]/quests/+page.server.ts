// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.server.ts
import { fail } from '@sveltejs/kit';
import { quests, db } from '@core/database';
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

	const result = await quests.getAll({
		worldId: params.worldId,
		status,
		page,
		perPage: 20,
	});

	return { ...result, status: status ?? null, canManage };
};

export const actions: Actions = {
	// Approve quest (PENDING_APPROVAL → PUBLISHED)
	approve: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data  = await request.formData();
		const id    = data.get('id')?.toString() ?? '';
		const note  = data.get('note')?.toString().trim() || undefined;
		try {
			await quests.updateStatus(id, 'PUBLISHED', note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// Reject quest (PENDING_APPROVAL → CANCELLED)
	reject: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason required.' });
		try {
			await quests.updateStatus(id, 'CANCELLED', note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// Approve quest result (PENDING_RESULT_APPROVAL → COMPLETED)
	approveResult: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const questId  = data.get('questId')?.toString() ?? '';
		try {
			const quest = await quests.getById(questId);
			if (!quest?.result) return fail(400, { message: 'No result to approve.' });
			await quests.approveResult(quest.result.id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// Reject quest result
	rejectResult: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const questId = data.get('questId')?.toString() ?? '';
		const note    = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason required.' });
		try {
			const quest = await quests.getById(questId);
			if (!quest?.result) return fail(400, { message: 'No result to reject.' });
			await quests.rejectResult(quest.result.id, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};