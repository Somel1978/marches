// apps/frontend/src/routes/signout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	await auth.api.signOut({ headers: request.headers });
	redirect(302, '/');
};

export const actions: Actions = {
	default: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(302, '/');
	},
};
