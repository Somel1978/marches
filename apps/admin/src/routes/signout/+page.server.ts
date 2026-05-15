// apps/admin/src/routes/signout/+page.server.ts
// Dedicated sign-out route accessible from any layout group.
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// GET /signout — direct link sign out
export const load: PageServerLoad = async ({ request }) => {
	await auth.api.signOut({ headers: request.headers });
	redirect(302, '/login');
};

export const actions: Actions = {
	default: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	},
};
