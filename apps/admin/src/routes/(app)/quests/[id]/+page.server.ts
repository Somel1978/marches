// apps/admin/src/routes/(app)/quests/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { quests } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const quest = await quests.getById(params.id);
	if (!quest) throw error(404, 'Quest not found');

	return { quest };
};

export const actions: Actions = {
	approve: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim();
		try {
			await quests.updateStatus(params.id, 'PUBLISHED', note, locals.user!.id);
			return { success: true, action: 'approved' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Review note is required when rejecting.' });
		try {
			await quests.updateStatus(params.id, 'CANCELLED', note, locals.user!.id);
			return { success: true, action: 'rejected' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	approveResult: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			const quest = await quests.getById(params.id);
			if (!quest?.result) return fail(400, { message: 'No result to approve.' });
			await quests.approveResult(quest.result.id, locals.user!.id);
			return { success: true, action: 'result_approved' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateDetails: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const missionXp   = Number(data.get('missionXp')   ?? 0);
		const minCapacity = Number(data.get('minCapacity') ?? 2);
		const maxCapacity = Number(data.get('maxCapacity') ?? 6);
		const minLevel    = Number(data.get('minLevel')    ?? 1);
		const maxLevel    = Number(data.get('maxLevel')    ?? 20);

		try {
			await quests.update(params.id, { missionXp, minCapacity, maxCapacity, minLevel, maxLevel }, locals.user!.id);
			return { success: true, action: 'details_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateRewards: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data         = await request.formData();
		const rewardTypes  = data.getAll('rewardType').map(v => v.toString());
		const rewardAmounts = data.getAll('rewardAmount').map(v => Number(v));
		const rewards      = rewardTypes.map((type, i) => ({
			type,
			amount: rewardAmounts[i] ?? 0,
		})).filter(r => r.type);

		try {
			await quests.updateRewards(params.id, rewards, locals.user!.id);
			return { success: true, action: 'rewards_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteQuest: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await quests.delete(params.id, locals.user!.id);
			redirect(302, '/quests');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	rejectResult: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Review note is required.' });
		try {
			const quest = await quests.getById(params.id);
			if (!quest?.result) return fail(400, { message: 'No result to reject.' });
			await quests.rejectResult(quest.result.id, note, locals.user!.id);
			return { success: true, action: 'result_rejected' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};