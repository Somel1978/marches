// apps/frontend/src/routes/(protected)/wiki/+page.server.ts
import { news, db } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Build user context for visibility filtering
	const dmProfile = await db.dMProfile.findFirst({
		where:  { userId: locals.user!.id },
		select: { id: true },
	});

	const ctx = {
		isDM:     !!dmProfile,
		isAdmin:  false,
		worldIds: [],
	};

	const wikis = await news.wiki.getForUser(ctx);

	const pageId = url.searchParams.get('page');
	if (pageId) {
		const page = await news.wiki.getPage(pageId);
		if (page) {
			const { tokens } = await news.enrichers.resolve(page.content);
			return { wikis, activePage: { ...page, tokens } };
		}
	}

	return { wikis, activePage: null };
};