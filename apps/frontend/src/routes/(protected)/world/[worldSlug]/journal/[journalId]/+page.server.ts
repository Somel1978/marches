// apps/frontend/src/routes/(protected)/world/[worldSlug]/journal/[journalId]/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds, news, characters, db } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	const [dmProfile, userChars] = await Promise.all([
		db.dMProfile.findFirst({ where: { userId: locals.user!.id }, select: { id: true } }),
		characters.getByUserId(locals.user!.id),
	]);
	const worldIds = [...new Set(
		userChars.filter((c: any) => c.status === 'ACTIVE' && c.worldId).map((c: any) => c.worldId as string)
	)];

	const ctx = { isDM: !!dmProfile, isAdmin: false, worldIds };

	const journals = await news.worldJournals.getForUser(world.id, ctx);
	const journal  = journals.find((j: any) => j.id === params.journalId);
	if (!journal) throw error(404, 'Journal not found');

	const activePageId = url.searchParams.get('page') ?? null;
	let activePage     = activePageId ? await news.worldJournals.getPage(activePageId) : null;

	// Default to first page of first section if none selected
	if (!activePage) {
		const firstSection = (journal.sections ?? [])[0];
		const firstPageId  = firstSection?.pages?.[0]?.id;
		if (firstPageId) activePage = await news.worldJournals.getPage(firstPageId);
	}

	let tokens: any[] = [];
	if (activePage?.content) {
		const resolved = await news.enrichers.resolve(activePage.content);
		tokens = resolved.tokens;
	}

	return { world, journal, activePage, tokens };
};