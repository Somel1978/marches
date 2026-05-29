// apps/frontend/src/routes/(protected)/journal/+page.server.ts
import { news, characters, users } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const [roleIds, userChars] = await Promise.all([
		users.getRoleIds(locals.user!.id),
		characters.getByUserId(locals.user!.id),
	]);

	// World IDs from user's active world-locked characters
	const worldIds = [...new Set(
		userChars
			.filter((c: any) => c.status === 'ACTIVE' && c.worldId)
			.map((c: any) => c.worldId as string)
	)];

	const journals = await news.journals.getForUser(roleIds, worldIds);

	const pageId = url.searchParams.get('page');
	if (pageId) {
		const page = await news.journals.getPage(pageId);
		if (page) {
			const { tokens } = await news.enrichers.resolve(page.content);
			return { journals, activePage: { ...page, tokens } };
		}
	}

	return { journals, activePage: null };
};