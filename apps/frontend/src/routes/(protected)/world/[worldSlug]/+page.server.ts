// apps/frontend/src/routes/(protected)/world/[worldSlug]/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds, platform, factions } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	const [settings, factionList] = await Promise.all([
		platform.getSettingsMap(),
		factions.getByWorld(world.id, { visibleOnly: true }),
	]);

	return {
		world,
		factions:   factionList,
		showDanger: settings['world.showDangerRating'] !== 'false',
		showLevel:  settings['world.showLevelRange']   !== 'false',
	};
};
