// apps/frontend/src/routes/(auth)/login/+page.server.ts
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(302, url.searchParams.get('redirectTo') ?? '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data     = await request.formData();
		const email    = data.get('email')?.toString()    ?? '';
		const password = data.get('password')?.toString() ?? '';

		if (!email || !password)
			return fail(400, { message: 'Email and password are required.', email });

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (e) {
			if (isRedirect(e)) throw e;
			if (e instanceof APIError) {
				// better-auth returns EMAIL_NOT_VERIFIED when requireEmailVerification=true
				if ((e as any).body?.code === 'EMAIL_NOT_VERIFIED') {
					return fail(403, { message: 'Your account is pending activation by an administrator.', email });
				}
				return fail(400, { message: 'Invalid email or password.', email });
			}
			return fail(500, { message: 'Unexpected error. Please try again.', email });
		}

		redirect(302, url.searchParams.get('redirectTo') ?? '/');
	},
};
