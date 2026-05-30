// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Region list is part of the world edit/settings page
export const load: PageServerLoad = async ({ params }) => {
	redirect(302, `/dm/worlds/${params.worldId}/edit`);
};
