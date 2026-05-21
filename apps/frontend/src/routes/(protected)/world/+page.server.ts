// apps/frontend/src/routes/(protected)/world/+page.server.ts
import { worlds, platform } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [allWorlds, settings] = await Promise.all([
		worlds.getAll(),
		platform.getSettingsMap(),
	]);
	return {
		worlds:      allWorlds,
		showDanger:  settings['world.showDangerRating'] !== 'false',
		showLevel:   settings['world.showLevelRange']   !== 'false',
	};
};