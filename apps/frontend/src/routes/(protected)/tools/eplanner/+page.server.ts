// apps/frontend/src/routes/(protected)/tools/eplanner/+page.server.ts
import { error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const systems = await gameSystems.getActive();
	const gs = systems.find(s => s.slug === 'dnd5e');
	if (!gs) throw error(404, 'D&D 5e game system not found');

	const cfg = await dnd5e.encounterPlanner.getConfig(gs.id);
	return {
		config: {
			crToXp:                 cfg.crToXp,
			levelThresholds:        cfg.levelThresholds,
			multipliers:            cfg.multipliers,
			moderateRatio:          cfg.moderateRatio,
			highRatio:              cfg.highRatio,
			extremeRatio:           cfg.extremeRatio,
			rewardGpRate:           cfg.rewardGpRate,
			adventureDayMultiplier: cfg.adventureDayMultiplier,
		},
	};
};
