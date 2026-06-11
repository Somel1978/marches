// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.server.ts
import { quests, marketplace, characters, availability, users } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { world } = await parent();

	const dayParam = url.searchParams.get('day');
	const today    = dayParam ? new Date(dayParam) : new Date();
	today.setHours(0,0,0,0);
	const dayEnd = new Date(today); dayEnd.setHours(23,59,59,999);

	const [pendingTx, pendingChars, worldQuests, allSlots] = await Promise.all([
		marketplace.transactions.getAll({ worldId: params.worldId, status: 'PENDING', page: 1 }),
		characters.getAll({ worldId: params.worldId, status: 'PENDING' }),
		quests.getAll({ worldId: params.worldId }),
		availability.getAll(today, dayEnd),
	]);

	// Get users who have active characters in this world
	const worldCharsResult = await characters.getAll({ worldId: params.worldId, status: 'ACTIVE' });
	const worldChars       = ((worldCharsResult as any).items ?? []) as any[];
	const worldUserIds     = new Set(worldChars.map((c: any) => c.userId));
	const acceptsGlobal    = (world as any).acceptsGlobalCharacters !== false;

	// Show slots where:
	// - scope=WORLD targeting this world (always)
	// - scope=GLOBAL only if world accepts global characters AND user has chars in this world
	const worldSlots = (allSlots as any[]).filter((s: any) =>
		(s.scope === 'WORLD' && s.worldIds?.includes(params.worldId)) ||
		(s.scope === 'GLOBAL' && acceptsGlobal && worldUserIds.has(s.userId))
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
		if (!charsByUser[(c as any).userId]) charsByUser[(c as any).userId] = [];
		const totalLevel = ((c as any).classes ?? []).reduce((s: number, cl: any) => s + (cl.allocatedLevel ?? 0), 0);
		charsByUser[(c as any).userId].push({ ...(c as any), totalLevel });
	}

	const bySlot: Record<number, any[]> = {};
	for (const s of worldSlots) {
		if (!bySlot[s.slot]) bySlot[s.slot] = [];
		// Show all active chars if global accepted, otherwise only chars in this world
		const userChars = (charsByUser[s.userId] ?? []).filter((c: any) => {
			if (c.status !== 'ACTIVE') return false;
			if (acceptsGlobal) return true;
			return (c as any).worldId === params.worldId;
		});
		bySlot[s.slot].push({
			id:       s.id,
			userId:   s.userId,
			userName: userMap[s.userId] ?? s.userId,
			scope:    s.scope,
			worldIds: s.worldIds,
			chars:    userChars,
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