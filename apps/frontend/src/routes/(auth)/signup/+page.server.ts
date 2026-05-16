// apps/frontend/src/routes/(auth)/signup/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { isMarchesError, ConflictError } from '@core/errors';
import { transactions, roles } from '@core/database';
import { sendWelcomeEmail } from '@core/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data     = await request.formData();
		const name     = data.get('name')?.toString().trim()     ?? '';
		const email    = data.get('email')?.toString().trim()    ?? '';
		const password = data.get('password')?.toString()        ?? '';

		if (!name)               return fail(400, { message: 'Name is required.',                        name, email });
		if (!email)              return fail(400, { message: 'Email is required.',                       name, email });
		if (!password)           return fail(400, { message: 'Password is required.',                    name, email });
		if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters.',  name, email });

		// Assign PLAYER role automatically on self-signup
		const playerRole = await roles.getAll().then(r => r.find(x => x.name === 'PLAYER'));
		const roleIds    = playerRole ? [playerRole.id] : [];

		try {
			await transactions.registerUser({
				name,
				email,
				password,
				roleIds,
				// No createdBy — self-registration
			});

			// Non-blocking welcome email
			sendWelcomeEmail(email, name).catch(err =>
				console.error('[email] welcome email failed', err)
			);

			// Redirect to pending page
			redirect(302, '/signup/pending');
		} catch (e) {
			if (e instanceof ConflictError) return fail(409, { message: 'An account with this email already exists.', name, email });
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message, name, email });
			throw e;
		}
	},
};
