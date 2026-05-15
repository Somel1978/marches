// apps/admin/src/routes/(auth)/reset-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }): Promise<{ invalidToken: true; token?: undefined } | { invalidToken?: undefined; token: string }> => {
	// better-auth passes the token as a query param
	const token = url.searchParams.get('token');
	if (!token) return { invalidToken: true };
	return { token };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data     = await request.formData();
		const password = data.get('password')?.toString() ?? '';
		const token    = data.get('token')?.toString()    ?? '';

		if (!password)           return fail(400, { message: 'Password is required.', token });
		if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters.', token });

		try {
			await auth.api.resetPassword({
				body:    { newPassword: password, token },
				headers: request.headers,
			});
		} catch {
			return fail(400, { message: 'Reset link is invalid or has expired. Request a new one.', token });
		}

		redirect(302, '/login?reset=1');
	},
};
