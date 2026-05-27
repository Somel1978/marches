// apps/frontend/src/routes/(protected)/characters/+page.server.ts
import { characters, gameSystems } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [myCharacters, slotInfo, systems] = await Promise.all([
		characters.getByUserId(locals.user!.id),
		characters.getSlotInfo(locals.user!.id),
		gameSystems.getActive(),
	]);

	return { characters: myCharacters, slotInfo, systems };
};