// apps/frontend/src/routes/(protected)/quests/+page.server.ts
import { quests } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page') ?? 1);
	return await quests.getAll({ status: 'PUBLISHED', page });
};
