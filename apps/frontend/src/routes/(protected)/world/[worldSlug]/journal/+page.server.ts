// apps/frontend/src/routes/(protected)/world/[worldSlug]/journal/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds, news, characters, db } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	// Build user context for visibility filtering
	const [dmProfile, userChars] = await Promise.all([
		db.dMProfile.findFirst({ where: { userId: locals.user!.id }, select: { id: true } }),
		characters.getByUserId(locals.user!.id),
	]);
	const worldIds = [...new Set(
		userChars.filter((c: any) => c.status === 'ACTIVE' && c.worldId).map((c: any) => c.worldId as string)
	)];

	const ctx = {
		isDM:     !!dmProfile,
		isAdmin:  false, // players never admin in reader
		worldIds,
	};

	const journals = await news.worldJournals.getForUser(world.id, ctx);

	const pageId = url.searchParams.get('page');
	if (pageId) {
		const page = await news.worldJournals.getPage(pageId);
		if (page) {
			const { tokens } = await news.enrichers.resolve(page.content);
			return { world, journals, activePage: { ...page, tokens } };
		}
	}

	return { world, journals, activePage: null };
};