// apps/admin/src/routes/(auth)/forgot-password/+page.server.ts
import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Already logged in — no need for reset
	if (locals.user) return { alreadyLoggedIn: true };
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data  = await request.formData();
		const email = data.get('email')?.toString().trim() ?? '';

		if (!email) return fail(400, { message: 'Email is required.', email });

		try {
			// better-auth handles token generation + calls our sendReset hook
			await auth.api.requestPasswordReset({
				body:    { email, redirectTo: '/reset-password' },
				headers: request.headers,
			});
		} catch {
			// Never reveal whether the email exists
		}

		// Always return success to prevent email enumeration
		return { sent: true, email };
	},
};