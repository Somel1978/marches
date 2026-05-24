// apps/frontend/src/routes/(protected)/stats/+page.server.ts
import { stats } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [publicStats, userStats] = await Promise.all([
		stats.getPublic(),
		stats.getUser(locals.user!.id),
	]);
	return { publicStats, userStats };
};
