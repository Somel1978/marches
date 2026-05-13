// apps/admin/src/routes/(auth)/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	// Already authenticated — send to intended destination or dashboard
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirectTo') ?? '/';
		redirect(302, redirectTo);
	}
	return {};
};

export const actions: Actions = {
	signIn: async ({ request, url }) => {
		const formData  = await request.formData();
		const email     = formData.get('email')?.toString()    ?? '';
		const password  = formData.get('password')?.toString() ?? '';
		const redirectTo = url.searchParams.get('redirectTo')  ?? '/';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers,
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: 'Invalid email or password.' });
			}
			return fail(500, { message: 'Unexpected error. Please try again.' });
		}

		redirect(302, redirectTo);
	},
};
