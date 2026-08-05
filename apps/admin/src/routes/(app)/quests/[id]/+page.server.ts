// apps/admin/src/routes/(app)/quests/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { quests, worlds, db } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const ITEM_RARITIES   = ['Mundane','Common','Uncommon','Rare','Very_Rare','Legendary','Artifact','Unknown'];
const ITEM_CATEGORIES = ['Combat','Consumable','Utility','Destroyable'];

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const [quest, allWorlds] = await Promise.all([
		quests.getById(params.id),
		worlds.getAll(),
	]);
	if (!quest) throw error(404, 'Quest not found');

	const itemUsages = await quests.itemUsage.getForQuest(params.id);
	const usageCharIds = [...new Set(itemUsages.map((u: any) => u.characterId))];
	const usageChars   = usageCharIds.length ? await db.character.findMany({ where: { id: { in: usageCharIds as string[] } }, select: { id: true, name: true } }) : [];
	const usageCharMap = Object.fromEntries(usageChars.map((c: any) => [c.id, c.name]));
	const itemUsagesEnriched = itemUsages.map((u: any) => ({ ...u, characterName: usageCharMap[u.characterId] ?? u.characterId }));

	const linkedPlotQuests = await worlds.plotQuests.listBySystemQuest(params.id);

	return {
		quest,
		allWorlds,
		itemUsages: itemUsagesEnriched,
		itemRarities: ITEM_RARITIES,
		itemCategories: ITEM_CATEGORIES,
		linkedPlotQuests,
	};
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
			await quests.updateStatus(params.id, 'DRAFT', note, locals.user!.id);
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
			const [quest, allWorlds] = await Promise.all([
		quests.getById(params.id),
		worlds.getAll(),
	]);
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
		const milestoneAward = Math.max(0, Number(data.get('milestoneAward') ?? 0));
		const minCapacity = Number(data.get('minCapacity') ?? 2);
		const maxCapacity = Number(data.get('maxCapacity') ?? 6);
		const minLevel    = Number(data.get('minLevel')    ?? 1);
		const maxLevel    = Number(data.get('maxLevel')    ?? 20);

		try {
			const regionId   = data.get('regionId')?.toString()   || null;
			const locationId = data.get('locationId')?.toString() || null;
			await quests.update(params.id, { missionXp, milestoneAward, minCapacity, maxCapacity, minLevel, maxLevel }, locals.user!.id);
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
		const rewardTypes   = data.getAll('rewardType').map(v => v.toString());
		const rewardAmounts = data.getAll('rewardAmount').map(v => Number(v));
		const rewards = rewardTypes.map((type, i) => ({
			type,
			amount:       type === 'ITEM' ? 0 : (rewardAmounts[i] ?? 0),
			itemRarity:   data.get(`itemRarity_${i}`)?.toString()  || undefined,
			itemCategory: data.get(`itemCategory_${i}`)?.toString() || undefined,
			itemMaxValue: Number(data.get(`itemMaxValue_${i}`) ?? 0) || undefined,
		})).filter(r => r.type);

		try {
			await quests.updateRewards(params.id, rewards, locals.user!.id);
			return { success: true, action: 'rewards_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteQuest: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			const data = await request.formData();
			const revertRewards = data.get('revertRewards') === 'true';
			console.log('[deleteQuest] revertRewards:', revertRewards);
			await quests.delete(params.id, locals.user!.id, revertRewards);
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