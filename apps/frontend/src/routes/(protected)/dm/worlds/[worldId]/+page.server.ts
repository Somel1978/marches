// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.server.ts
import { quests, marketplace, characters } from '@core/database';
import { loadWorldAvailability } from '$lib/dm/build-availability-dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { world } = await parent();
	const weekParam = url.searchParams.get('week');
	const acceptsGlobal = (world as any).acceptsGlobalCharacters !== false;

	const [pendingTx, pendingChars, worldQuests, availability] = await Promise.all([
		marketplace.transactions.getAll({ worldId: params.worldId, status: 'PENDING', page: 1 }),
		characters.getAll({ worldId: params.worldId, status: 'PENDING' }),
		quests.getAll({ worldId: params.worldId }),
		loadWorldAvailability(params.worldId, weekParam, acceptsGlobal),
	]);

	return {
		pendingTransactions: pendingTx.total,
		pendingCharacters: pendingChars.total,
		questStats: {
			total: worldQuests.total,
			inProgress: worldQuests.items.filter((q: any) => q.status === 'IN_PROGRESS').length,
			pending: worldQuests.items.filter((q: any) => q.status === 'PENDING_APPROVAL').length,
		},
		regionCount: world.regions?.length ?? 0,
		availability,
	};
};
