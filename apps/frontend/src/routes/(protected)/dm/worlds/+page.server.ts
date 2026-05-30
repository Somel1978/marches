// apps/frontend/src/routes/(protected)/dm/worlds/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { myWorlds } = await parent();
	// If DM only has one world, go straight to it
	if (myWorlds.length === 1) throw redirect(302, `/dm/worlds/${myWorlds[0].id}`);
	return {};
};
