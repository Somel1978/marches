// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.server.ts
import { error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const { dmProfile, myWorlds } = await parent();

	// Guard: this DM must be assigned to this world
	const assignment = (myWorlds as any[]).find((w: any) => w.id === params.worldId);
	if (!assignment) throw error(403, 'You are not assigned to this world.');

	const canManage = assignment.canManage === true;

	// Load full world data (includes regions, dms)
	const world = await worlds.getById(params.worldId);
	if (!world) throw error(404, 'World not found.');

	return { world, dmProfile, myWorlds, canManage };
};
