// apps/frontend/src/routes/(protected)/characters/public/+page.server.ts
import { characters, gameSystems } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const [list, systems] = await Promise.all([
		characters.getPublic(q || undefined),
		gameSystems.getActive(),
	]);
	// Build a lookup map for gameSystem names
	const systemMap = Object.fromEntries((systems as any[]).map((s: any) => [s.id, s]));
	const chars = (list as any[]).map((c: any) => ({ ...c, gameSystem: systemMap[c.gameSystemId] ?? null }));
	return { characters: chars, q };
};