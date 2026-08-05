// apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { availability, characters, dms, quests, worlds, notifications, db, platform, users } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const ITEM_RARITIES   = ['Mundane','Common','Uncommon','Rare','Very_Rare','Legendary','Artifact','Unknown'];
const ITEM_CATEGORIES = ['Combat','Consumable','Utility','Destroyable'];

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


async function checkCanApprove(questId: string, userId: string) {
	const quest = await quests.getById(questId);
	if (!quest) return null;
	const profile = await dms.profiles.getByUserId(userId);
	if (!profile) return null;
	// Get worldId via region
	const regionId = (quest as any).regionId;
	if (!regionId) return null;
	const region = await db.region.findUnique({ where: { id: regionId }, select: { worldId: true } });
	const worldId = region?.worldId ?? null;
	if (!worldId) return null;
	// Must have canManage on this world — canManage DMs CAN approve their own quests
	const assignment = await db.worldDM.findUnique({
		where:  { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	if (!assignment?.canManage) return null;
	return { quest, profile, worldId };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const access = await checkDMAccess(params.id, locals.user!.id);
	if (!access) throw error(403, 'Forbidden');

	const [allDMProfiles, allWorlds] = await Promise.all([
		dms.profiles.getAll(),
		worlds.getAll(),
	]);

	const questRatings = access.quest.status === 'COMPLETED'
		? await db.dMRating.findMany({
			where:   { questId: params.id },
			orderBy: { createdAt: 'desc' },
		})
		: [];

	const settings            = await platform.getSettingsMap();
	const destroyableCategories = (settings['quest.destroyableCategories'] ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);

	// Load destroyable inventory for confirmed characters (IN_PROGRESS only)
	let destroyableInventory: any[] = [];
	if (access.quest.status === 'IN_PROGRESS' && destroyableCategories.length) {
		const confirmedCharIds = access.quest.signups
			.filter((s: any) => s.status === 'CONFIRMED')
			.map((s: any) => s.characterId);
		if (confirmedCharIds.length) {
			// CharacterInventory has no FK relation — filter by matching marketplace items
			const matchingItems = await db.marketplaceItem.findMany({
				where:  { category: { in: destroyableCategories as any[] } },
				select: { id: true, name: true, category: true },
			});
			const matchingItemIds = matchingItems.map(i => i.id);
			const itemMap = Object.fromEntries(matchingItems.map(i => [i.id, i]));
			if (matchingItemIds.length) {
				const inv = await db.characterInventory.findMany({
					where: {
						characterId: { in: confirmedCharIds },
						itemId:      { in: matchingItemIds },
					},
				});

				// Load existing PENDING usages and subtract from available
				const pendingUsages = await db.questItemUsage.findMany({
					where: { questId: params.id, status: 'PENDING' },
				});
				const pendingMap: Record<string, number> = {};
				for (const u of pendingUsages) {
					pendingMap[u.inventoryId] = (pendingMap[u.inventoryId] ?? 0) + u.quantityUsed;
				}

				destroyableInventory = inv.map(i => ({
					...i,
					item:              itemMap[i.itemId ?? ''] ?? null,
					availableQuantity: Math.max(0, i.quantity - (pendingMap[i.id] ?? 0)),
					pendingUsed:       pendingMap[i.id] ?? 0,
				}));
			}
		}
	}

	const itemUsages = await quests.itemUsage.getForQuest(params.id);

	// Available players based on quest scheduledAt
	let availablePlayers: any[] = [];
	const q = access.quest as any;
	if (q.scheduledAt && q.status === 'PUBLISHED') {
		const d       = new Date(q.scheduledAt);
		const mins    = d.getUTCHours() * 60 + d.getUTCMinutes();
		const slot    = Math.floor(mins / 30);
		const date    = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

		// Resolve worldId from regionId — quest has no direct worldId field
		let worldId: string | null = null;
		if (q.regionId) {
			const region = await db.region.findUnique({ where: { id: q.regionId }, select: { worldId: true } });
			worldId = region?.worldId ?? null;
		}

		const userSlots   = await availability.getForQuest(date, slot, worldId);
		const userIds     = [...new Set(userSlots.map((s: any) => s.userId))];
		if (userIds.length) {
			const signedUpCharIds = new Set(access.quest.signups.map((s: any) => s.characterId));
			const allChars = (await Promise.all(userIds.map((uid: unknown) => characters.getByUserId(uid as string)))).flat();
			const userRecords = await Promise.all(userIds.map((uid) => users.getById(uid as string)));
			const userNames = Object.fromEntries(
				userRecords.filter(Boolean).map((u: any) => [u.id, u.name]),
			);
			availablePlayers = allChars
				.filter((c: any) => !signedUpCharIds.has(c.id) && c.status === 'ACTIVE')
				.map((c: any) => ({
					...c,
					playerName: userNames[(c as any).userId] ?? null,
					totalLevel:
						(c as any).totalLevel ??
						((c as any).classes ?? []).reduce((s: number, cl: any) => s + (cl.allocatedLevel ?? 0), 0),
				}));
		}
	}

	const canApprove = !!(await checkCanApprove(params.id, locals.user!.id));
	const encounterConfig = await quests.loadEncounterConfig();
	const linkedPlotQuests = await worlds.plotQuests.listBySystemQuest(params.id);

	return {
		quest: access.quest,
		profile: access.profile,
		isMainDM: access.isMainDM,
		allDMProfiles,
		allWorlds,
		questRatings,
		itemRarities: ITEM_RARITIES,
		itemCategories: ITEM_CATEGORIES,
		destroyableInventory,
		itemUsages,
		availablePlayers,
		canApprove,
		encounterConfig,
		linkedPlotQuests,
	};
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

	invite: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		if (!characterId) return fail(400, { message: 'Character required.' });
		// Verify DM owns this quest
		const quest = await quests.getById(params.id);
		if (!quest) return fail(404, { message: 'Quest not found.' });
		const dm = await dms.profiles.getByUserId(locals.user!.id);
		if (!dm || (quest as any).dmProfileId !== dm.id) return fail(403, { message: 'Forbidden.' });
		// Send notification to character owner
		const char = await characters.getById(characterId);
		if (!char) return fail(404, { message: 'Character not found.' });
		await notifications.create(
			char.userId,
			'QUEST_INVITE',
			`Quest invite: ${quest.title}`,
			`You have been invited to join "${quest.title}". Check the quest page to sign up.`,
			`/quests/${quest.id}`,
		);
		return { inviteSuccess: true };
	},

	submitResult: async ({ params, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		try {
			await quests.submitResult(params.id, access.profile.id, locals.user!.id);
			await quests.updateStatus(params.id, 'PENDING_RESULT_APPROVAL', undefined, locals.user!.id);
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
		const missionXpRaw  = Number(data.get('missionXp') ?? 0);
		const planJson      = data.get('encounterPlan')?.toString() ?? '';
		const { missionXp, encounterPlan } = await quests.resolveMissionXp(planJson, missionXpRaw);
		const milestoneAward = Math.max(0, Number(data.get('milestoneAward') ?? 0));
		const minCapacity = Number(data.get('minCapacity') ?? 2);
		const maxCapacity = Number(data.get('maxCapacity') ?? 6);
		const minLevel    = Number(data.get('minLevel')    ?? 1);
		const maxLevel    = Number(data.get('maxLevel')    ?? 20);

		try {
			const regionId   = data.get('regionId')?.toString()   || undefined;
			const locationId = data.get('locationId')?.toString() || undefined;
			await quests.update(params.id, { missionXp, milestoneAward, encounterPlan, minCapacity, maxCapacity, minLevel, maxLevel, regionId, locationId, description }, locals.user!.id);
			return { success: true, action: 'details_updated' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateRewards: async ({ params, request, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		if (!['DRAFT', 'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_RESULT', 'PENDING_RESULT_APPROVAL'].includes(access.quest.status))
			return fail(400, { message: 'Rewards can only be edited in DRAFT, PENDING_APPROVAL, IN_PROGRESS or PENDING_RESULT status.' });

		const data          = await request.formData();
		const rewardTypes   = data.getAll('rewardType').map(v => v.toString());
		const rewardAmounts = data.getAll('rewardAmount').map(v => Number(v));
		const rewards       = rewardTypes.map((type, i) => ({
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

	saveItemUsages: async ({ params, request, locals }) => {
		const access = await checkDMAccess(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'Forbidden' });
		if (access.quest.status !== 'IN_PROGRESS') return fail(400, { message: 'Quest must be in progress.' });
		const data        = await request.formData();
		const charIds     = data.getAll('characterId').map(v => v.toString());
		const inventoryIds = data.getAll('inventoryId').map(v => v.toString());
		const quantities  = data.getAll('quantityUsed').map(v => Number(v));
		try {
			// Delete existing PENDING usages for this quest then re-create
			await db.questItemUsage.deleteMany({ where: { questId: params.id, status: 'PENDING' } });
			const usages = [];
			for (let i = 0; i < charIds.length; i++) {
				if (quantities[i] > 0) {
					const inv = await db.characterInventory.findUnique({ where: { id: inventoryIds[i] }, select: { itemName: true } });
					usages.push({ questId: params.id, characterId: charIds[i], inventoryId: inventoryIds[i],
						itemName: inv?.itemName ?? inventoryIds[i], quantityUsed: quantities[i],
						submittedBy: locals.user!.id, status: 'PENDING' as any });
				}
			}
			// Validate quantities against actual inventory
			for (const u of usages) {
				const inv = await db.characterInventory.findUnique({ where: { id: u.inventoryId } });
				if (!inv || inv.quantity < u.quantityUsed) {
					const name = inv?.itemName ?? u.inventoryId;
					return fail(400, { message: `Insufficient quantity for "${name}". Available: ${inv?.quantity ?? 0}.` });
				}
			}
			if (usages.length) await db.questItemUsage.createMany({ data: usages });
			return { usageSaved: true };
		} catch (e) {
			if (isMarchesError(e)) return fail((e as any).statusCode ?? 500, { message: (e as any).message });
			throw e;
		}
	},

	approve: async ({ params, locals }) => {
		const access = await checkCanApprove(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'You cannot approve this quest.' });
		try {
			await quests.updateStatus(params.id, 'PUBLISHED', undefined, locals.user!.id);
			return { success: true, action: 'approved' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ params, request, locals }) => {
		const access = await checkCanApprove(params.id, locals.user!.id);
		if (!access) return fail(403, { message: 'You cannot reject this quest.' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason required.' });
		try {
			await quests.updateStatus(params.id, 'CANCELLED', note, locals.user!.id);
			return { success: true, action: 'rejected' };
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