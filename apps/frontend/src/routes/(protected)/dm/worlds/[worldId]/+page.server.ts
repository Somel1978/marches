// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.server.ts
import { quests, marketplace, characters, availability, users } from '@core/database';
import type { PageServerLoad } from './$types';

const EXCLUDED_STATUSES = ['RETIRED', 'DECEASED', 'REJECTED'];

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { world } = await parent();

	const dayParam = url.searchParams.get('day');
	const today    = dayParam ? new Date(dayParam) : new Date();
	today.setUTCHours(0,0,0,0);
	const dayEnd = new Date(today); dayEnd.setUTCHours(23,59,59,999);

	const [pendingTx, pendingChars, worldQuests, allSlots] = await Promise.all([
		marketplace.transactions.getAll({ worldId: params.worldId, status: 'PENDING', page: 1 }),
		characters.getAll({ worldId: params.worldId, status: 'PENDING' }),
		quests.getAll({ worldId: params.worldId }),
		availability.getAll(today, dayEnd),
	]);

	const acceptsGlobal = (world as any).acceptsGlobalCharacters !== false;

	// Player visibility based on availability scope only:
	// - scope=GLOBAL → always show (player is available everywhere)
	// - scope=WORLD → only show if targeting this world
	const worldSlots = (allSlots as any[]).filter((s: any) =>
		s.scope === 'GLOBAL' ||
		(s.scope === 'WORLD' && s.worldIds?.includes(params.worldId))
	);

	if (!worldSlots.length) {
		return { pendingTransactions: pendingTx.total, pendingCharacters: pendingChars.total,
			questStats: { total: worldQuests.total,
				inProgress: worldQuests.items.filter((q: any) => q.status === 'IN_PROGRESS').length,
				pending: worldQuests.items.filter((q: any) => q.status === 'PENDING_APPROVAL').length },
			regionCount: world.regions?.length ?? 0, bySlot: {}, dayStr: today.toISOString().split('T')[0] };
	}

	const userIds  = [...new Set(worldSlots.map((s: any) => s.userId))];
	const allUsers = await users.getAll({ page: 1, perPage: 200 });
	const userMap  = Object.fromEntries(((allUsers as any).items ?? []).map((u: any) => [u.id, u.name]));
	const allChars = (await Promise.all(userIds.map((uid: string) => characters.getByUserId(uid)))).flat();
	const charsByUser: Record<string, any[]> = {};
	for (const c of allChars) {
		if (EXCLUDED_STATUSES.includes((c as any).status)) continue;
		if (!charsByUser[(c as any).userId]) charsByUser[(c as any).userId] = [];
		const totalLevel = ((c as any).classes ?? []).reduce((s: number, cl: any) => s + (cl.allocatedLevel ?? 0), 0);
		charsByUser[(c as any).userId].push({ ...(c as any), totalLevel });
	}

	const bySlot: Record<number, any[]> = {};
	for (const s of worldSlots) {
		if (!bySlot[s.slot]) bySlot[s.slot] = [];
		const allUserChars = charsByUser[s.userId] ?? [];
		// For world display: if world accepts global show all chars, otherwise only chars assigned to this world
		const userChars = acceptsGlobal
			? allUserChars
			: allUserChars.filter((c: any) => c.worldId === params.worldId);
		bySlot[s.slot].push({
			id:          s.id,
			userId:      s.userId,
			userName:    userMap[s.userId] ?? s.userId,
			scope:       s.scope,
			worldIds:    s.worldIds,
			chars:       userChars,
			needsNewChar: userChars.length === 0,
		});
	}

	return {
		pendingTransactions: pendingTx.total,
		pendingCharacters:   pendingChars.total,
		questStats: {
			total:       worldQuests.total,
			inProgress:  worldQuests.items.filter((q: any) => q.status === 'IN_PROGRESS').length,
			pending:     worldQuests.items.filter((q: any) => q.status === 'PENDING_APPROVAL').length,
		},
		regionCount: world.regions?.length ?? 0,
		bySlot,
		dayStr: today.toISOString().split('T')[0],
	};
};