// apps/frontend/src/routes/(protected)/world/[worldSlug]/timeline/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	const { calendar, entries } = await worlds.timeline.listEntries(world.id, {
		includeDmOnly: false,
		includeDraftPlotQuests: false,
	});

	return { world, calendar, entries };
};
