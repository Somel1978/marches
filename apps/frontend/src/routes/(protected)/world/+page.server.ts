// apps/frontend/src/routes/(protected)/world/+page.server.ts
import { worlds } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allWorlds = await worlds.getAll();
	return { worlds: allWorlds.filter((w: any) => w.isActive) };
};