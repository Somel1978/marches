// apps/frontend/src/routes/(protected)/dm/+page.server.ts
import { quests } from '@core/database';
import { loadGlobalAvailability } from '$lib/dm/build-availability-dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { dmProfile } = await parent();
	const weekParam = url.searchParams.get('week');

	const [myQuests, availability] = await Promise.all([
		quests.getByDM(dmProfile.id),
		loadGlobalAvailability(weekParam),
	]);

	return { quests: myQuests, availability };
};
