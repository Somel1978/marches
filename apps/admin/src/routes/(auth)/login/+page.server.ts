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
		const password   = formData.get('password')?.toString() ?? '';;
		const redirectTo = url.searchParams.get('redirectTo')   ?? '/';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		try {
			const result = await auth.api.signInEmail({
				body: { email, password },
			});

			console.log('[login] signInEmail result:', result?.user?.email);

			// sveltekitCookies plugin should handle this automatically,
			// but as fallback manually set the cookie if we have a token
			if (result?.token) {
				const isSecure = url.protocol === 'https:';
				const cookieName = isSecure
					? '__Secure-better-auth.session_token'
					: 'better-auth.session_token';
				console.log('[login] setting cookie:', cookieName);
				cookies.set(cookieName, result.token, {
					path:     '/',
					httpOnly: true,
					sameSite: 'lax',
					secure:   isSecure,
					maxAge:   60 * 60 * 24 * 7, // 7 days
				});
			}

		} catch (error) {
			if (isRedirect(error)) throw error;
			if (error instanceof APIError) {
				console.error('[login] APIError:', error.message, error.status);
				return fail(400, { message: 'Invalid email or password.' });
			}
			console.error('[login] unexpected error:', error);
			return fail(500, { message: 'Unexpected error. Please try again.' });
		}

		redirect(302, redirectTo);
	},
};