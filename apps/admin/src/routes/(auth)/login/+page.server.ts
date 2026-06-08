// apps/admin/src/routes/(auth)/login/+page.server.ts
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(302, url.searchParams.get('redirectTo') ?? '/');
	return {};
};

export const actions: Actions = {
	signIn: async ({ request, cookies, url }) => {
		const formData   = await request.formData();
		const email      = formData.get('email')?.toString()    ?? '';
		const password   = formData.get('password')?.toString() ?? '';
		const redirectTo = url.searchParams.get('redirectTo')   ?? '/';

		if (!email || !password)
			return fail(400, { message: 'Email and password are required.' });

		try {
			// Build a proper JSON request to the Better Auth sign-in endpoint.
			// Passing a real Request lets Better Auth set the Set-Cookie header
			// on its response, which we then forward to the browser via cookies.set().
			// This avoids the manual cookie hack and lets Better Auth control
			// cookie attributes correctly.
			const authRequest = new Request(
				new URL('/api/auth/sign-in/email', url.origin),
				{
					method:  'POST',
					headers: { 'content-type': 'application/json' },
					body:    JSON.stringify({ email, password }),
				}
			);

			const response = await auth.handler(authRequest);

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const code  = (body as any)?.code;
				if (code === 'EMAIL_NOT_VERIFIED')
					return fail(403, { message: 'Your account is pending activation.' });
				return fail(400, { message: 'Invalid email or password.' });
			}

			// Forward all Set-Cookie headers from Better Auth to the browser.
			for (const cookie of response.headers.getSetCookie?.() ?? []) {
				const [nameVal, ...parts] = cookie.split('; ');
				const eqIdx    = nameVal.indexOf('=');
				const name     = nameVal.slice(0, eqIdx);
				const value    = nameVal.slice(eqIdx + 1);
				let httpOnly   = false;
				let secure     = false;
				let sameSite: 'lax' | 'strict' | 'none' | boolean = 'lax';
				let maxAge: number | undefined;
				let path       = '/';
				for (const part of parts) {
					const lower = part.toLowerCase().trim();
					if (lower === 'httponly')           httpOnly = true;
					if (lower === 'secure')             secure   = true;
					if (lower.startsWith('samesite='))  sameSite = part.split('=')[1].toLowerCase() as 'lax' | 'strict' | 'none';
					if (lower.startsWith('max-age='))   maxAge   = parseInt(part.split('=')[1]);
					if (lower.startsWith('path='))      path     = part.split('=')[1];
				}
				try {
					cookies.set(name, decodeURIComponent(value), { path, httpOnly, secure, sameSite, maxAge });
				} catch {}
			}

		} catch (error) {
			if (isRedirect(error)) throw error;
			if (error instanceof APIError)
				return fail(400, { message: 'Invalid email or password.' });
			console.error('[login] unexpected error:', error);
			return fail(500, { message: 'Unexpected error. Please try again.' });
		}

		redirect(302, redirectTo);
	},
};