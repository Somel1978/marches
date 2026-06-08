// apps/frontend/src/routes/(auth)/signup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data     = await request.formData();
		const name     = data.get('name')?.toString().trim()  ?? '';
		const email    = data.get('email')?.toString().trim() ?? '';
		const password = data.get('password')?.toString()     ?? '';

		if (!name)               return fail(400, { message: 'Name is required.',                       name, email });
		if (!email)              return fail(400, { message: 'Email is required.',                      name, email });
		if (!password)           return fail(400, { message: 'Password is required.',                   name, email });
		if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters.', name, email });

		// Use SITE_URL from env as the canonical origin for verification emails.
		// Cloudflare Tunnel does not reliably forward host headers through adapter-node.
		// Falls back to url.origin for direct IP access (dev without tunnel).
		const publicOrigin = env.SITE_URL ?? url.origin;

		const response = await auth.handler(
			new Request(new URL('/api/auth/sign-up/email', publicOrigin), {
				method:  'POST',
				headers: {
					'content-type': 'application/json',
					'host':         new URL(publicOrigin).host,
				},
				body: JSON.stringify({ name, email, password, callbackURL: publicOrigin + '/' }),
			})
		);

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			const code = (body as any)?.code;
			if (code === 'USER_ALREADY_EXISTS')
				return fail(409, { message: 'An account with this email already exists.', name, email });
			return fail(400, { message: (body as any)?.message ?? 'Registration failed.', name, email });
		}

		redirect(302, '/signup/pending');
	},
};