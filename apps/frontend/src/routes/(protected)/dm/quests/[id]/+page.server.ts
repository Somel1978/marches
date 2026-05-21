// apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { dms, quests, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

async function checkDMAccess(questId: string, userId: string) {
	const quest = await quests.getById(questId);
	if (!quest) return null;
	const profile = await dms.profiles.getByUserId(userId);
	if (!profile) return null;
	// Must be main DM or co-DM
	const isMainDM = quest.dmProfileId === profile.id;
	const isCoDM   = quest.coDMs.some(c => c.dmProfileId === profile.id);
	if (!isMainDM && !isCoDM) return null;
	return { quest, profile, isMainDM };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const access = await checkDMAccess(params.id, locals.user!.id);
	if (!access) throw error(403, 'Forbidden');

	const [allDMProfiles, allWorlds] = await Promise.all([
		dms.profiles.getAll(),
		worlds.getAll(),
	]);

	return { quest: access.quest, profile: access.profile, isMainDM: access.isMainDM, allDMProfiles, allWorlds };
};

export const actions: Actions = {
	submit: async ({ params, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		try {
			await quests.updateStatus(params.id, 'PENDING_APPROVAL', undefined, locals.user!.id);
			return { success: true, action: 'submitted' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	start: async ({ params, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		try {
			await quests.updateStatus(params.id, 'IN_PROGRESS', undefined, locals.user!.id);
			return { success: true, action: 'started' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	end: async ({ params, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		try {
			await quests.updateStatus(params.id, 'PENDING_RESULT', undefined, locals.user!.id);
			return { success: true, action: 'ended' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	submitResult: async ({ params, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		try {
			await quests.submitResult(params.id, access.profile.id, locals.user!.id);
			return { success: true, action: 'result_submitted' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	confirmWaitlist: async ({ request, locals }) => {
		const data     = await request.formData();
		const signupId = data.get('signupId')?.toString() ?? '';
		try {
			await quests.confirmWaitlistPromotion(signupId, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateDetails: async ({ params, request, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const description = data.get('description')?.toString().trim() || undefined;
		const missionXp   = Number(data.get('missionXp')   ?? 0);
		const minCapacity = Number(data.get('minCapacity') ?? 2);
		const maxCapacity = Number(data.get('maxCapacity') ?? 6);
		const minLevel    = Number(data.get('minLevel')    ?? 1);
		const maxLevel    = Number(data.get('maxLevel')    ?? 20);

		try {
			const regionId   = data.get('regionId')?.toString()   || undefined;
			const locationId = data.get('locationId')?.toString() || undefined;
			await quests.update(params.id, { missionXp, minCapacity, maxCapacity, minLevel, maxLevel, regionId, locationId, description }, locals.user!.id);
			return { success: true, action: 'details_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateRewards: async ({ params, request, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		if (!['DRAFT', 'PENDING_APPROVAL'].includes(access.quest.status))
			return fail(400, { message: 'Rewards can only be edited in DRAFT or PENDING_APPROVAL status.' });

		const data          = await request.formData();
		const rewardTypes   = data.getAll('rewardType').map(v => v.toString());
		const rewardAmounts = data.getAll('rewardAmount').map(v => Number(v));
		const rewards       = rewardTypes.map((type, i) => ({
			type, amount: rewardAmounts[i] ?? 0,
		})).filter(r => r.type);

		try {
			await quests.updateRewards(params.id, rewards, locals.user!.id);
			return { success: true, action: 'rewards_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addCoDM: async ({ params, request, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access?.isMainDM) return fail(403, { message: 'Only the main DM can add co-DMs.' });
		const data        = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		try {
			await quests.addCoDM(params.id, dmProfileId, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};