// apps/frontend/src/routes/(protected)/quests/+page.server.ts
import { quests, dms, db, platform } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const page = Number(url.searchParams.get('page') ?? 1);
	const tab  = url.searchParams.get('tab') ?? 'open';

	const settings       = await platform.getSettingsMap();
	const ratingsEnabled = settings['dm.ratingsEnabled'] !== 'false';

	if (tab === 'completed') {
		const result = await quests.getAll({ status: 'COMPLETED', page });

		// Load user's ratings for completed quests they participated in
		const userId    = locals.user!.id;
		const userChars = await db.character.findMany({ where: { userId }, select: { id: true } });
		const charIds   = userChars.map(c => c.id);

		// Which of these quests did the user participate in?
		const signups = await db.questSignup.findMany({
			where: { characterId: { in: charIds }, questId: { in: result.items.map(q => q.id) }, status: 'CONFIRMED' },
			select: { questId: true },
		});
		const participatedIds = new Set(signups.map(s => s.questId));

		// Load existing ratings
		const dmProfiles = [...new Set(result.items.map(q => q.dmProfileId))];
		const ratings = participatedIds.size ? await db.dMRating.findMany({
			where: { userId, questId: { in: [...participatedIds] } },
			select: { questId: true, rating: true },
		}) : [];
		const ratingMap = Object.fromEntries(ratings.map(r => [r.questId, r.rating]));

		return {
			...result,
			tab: 'completed',
			participatedIds: [...participatedIds],
			ratingMap,
			ratingsEnabled,
		};
	}

	return { ...await quests.getAll({ status: 'PUBLISHED', page }), tab: 'open', participatedIds: [], ratingMap: {}, ratingsEnabled };
};