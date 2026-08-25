// apps/frontend/src/routes/(protected)/world/[worldSlug]/plots/[plotId]/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	try {
		const log = await worlds.plotQuests.getPlayLog(params.plotId);
		if (log.plot.worldId !== world.id) throw error(404, 'Plot not found');
		return { world, plot: log.plot, beats: log.beats };
	} catch (e) {
		if (isMarchesError(e) && e.statusCode === 404) throw error(404, 'Plot not found');
		throw e;
	}
};
