// apps/admin/src/routes/(auth)/login/+page.server.ts
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirectTo') ?? '/';
		redirect(302, redirectTo);
	}
	return {};
};

export const actions: Actions = {
	signIn: async ({ request, cookies, url }) => {
		const formData   = await request.formData();
		const email      = formData.get('email')?.toString()    ?? '';
		const password   = formData.get('password')?.toString() ?? '';
		const redirectTo = url.searchParams.get('redirectTo')   ?? '/';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		try {
			const result = await auth.api.signInEmail({
				body: { email, password },
			});

			// sveltekitCookies plugin handles this automatically over HTTPS.
			// Over HTTP (local IP), manually set the plain (non-Secure) cookie
			// because useSecureCookies:false means Better Auth always uses
			// the 'better-auth.session_token' name without __Secure- prefix.
			if (result?.token) {
				const isSecure = url.protocol === 'https:';
				cookies.set('better-auth.session_token', result.token, {
					path:     '/',
					httpOnly: true,
					sameSite: 'lax',
					secure:   isSecure,
					maxAge:   60 * 60 * 24 * 7,
				});
			}

		} catch (error) {
			if (isRedirect(error)) throw error;
			if (error instanceof APIError) {
				return fail(400, { message: 'Invalid email or password.' });
			}
			console.error('[login] unexpected error:', error);
			return fail(500, { message: 'Unexpected error. Please try again.' });
		}

		redirect(302, redirectTo);
	},
};