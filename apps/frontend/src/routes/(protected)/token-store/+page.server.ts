// apps/frontend/src/routes/(protected)/token-store/+page.server.ts
import { characters, tokenStore, gameSystems } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const search = url.searchParams.get('search') ?? undefined;

	const myChars = await characters.getByUserId(locals.user!.id);
	const activeChars = (myChars as any[]).filter((c: any) => ['ACTIVE','RESTING'].includes(c.status));

	// Collect worldIds + gameSystemIds for the active characters
	const worldIds      = [...new Set(activeChars.map((c: any) => c.worldId).filter(Boolean))];
	const gameSystemIds = [...new Set(activeChars.map((c: any) => c.gameSystemId).filter(Boolean))];

	// Show items that are global, or in one of the player's worlds
	// and compatible with at least one of their characters' game systems
	const allItems = await tokenStore.items.getAll({ search, activeOnly: true });

	const items = (allItems as any[]).filter((item: any) => {
		const scopeOk = item.scope === 'GLOBAL' || worldIds.includes(item.worldId);
		const sysOk   = !item.gameSystemId || gameSystemIds.includes(item.gameSystemId);
		return scopeOk && sysOk;
	});

	const systems = await gameSystems.getActive();

	return { items, activeChars, search, systems };
};
