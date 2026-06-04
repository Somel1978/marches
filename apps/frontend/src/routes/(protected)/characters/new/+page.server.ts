// apps/frontend/src/routes/(protected)/characters/new/+page.server.ts
// Agnostic gate — lists active game systems. Selecting one routes to /characters/new/{slug}.
import { redirect } from '@sveltejs/kit';
import { characters, gameSystems } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [slotInfo, systems] = await Promise.all([
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getActive(),
	]);

	if (slotInfo.available <= 0) redirect(302, '/characters');

	return { slotInfo, systems };
};