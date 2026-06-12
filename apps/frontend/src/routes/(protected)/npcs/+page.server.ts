// apps/frontend/src/routes/(protected)/npcs/+page.server.ts
import { factions, worlds } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q       = url.searchParams.get('q')?.trim() ?? '';
	const worldId = url.searchParams.get('worldId') ?? '';

	const [npcs, allWorlds] = await Promise.all([
		factions.npcs.getPublic(q || undefined, worldId || undefined),
		worlds.getAll(),
	]);

	return {
		npcs,
		worlds: (allWorlds as any[]).filter((w: any) => w.isActive),
		q,
		worldId,
	};
};
