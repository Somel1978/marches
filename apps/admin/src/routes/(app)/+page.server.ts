// apps/admin/src/routes/(app)/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { analytics } from '@core/database';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		metrics: await analytics.getPlatformMetrics(),
	};
};

export const actions: Actions = {
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	},
};