// apps/admin/src/routes/(app)/users/new/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import { transactions, roles } from '@core/database';
import { checkPermission } from '@core/rbac';
import { sendWelcomeEmail } from '@core/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const canCreate = checkPermission(locals.permissions, { resourceKey: 'User', action: 'create' });
	if (!canCreate.allowed) throw error(403, 'Forbidden');
	return { roles: await roles.getAll() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const canCreate = checkPermission(locals.permissions, { resourceKey: 'User', action: 'create' });
		if (!canCreate.allowed) return fail(403, { message: 'Forbidden', name: '', email: '', discordHandle: '', mobile: '' });

		const data          = await request.formData();
		const name          = data.get('name')?.toString().trim()          ?? '';
		const email         = data.get('email')?.toString().trim()         ?? '';
		const password      = data.get('password')?.toString()             ?? '';
		const discordHandle = data.get('discordHandle')?.toString().trim() ?? '';
		const mobile        = data.get('mobile')?.toString().trim()        ?? '';
		const roleIds       = data.getAll('roleIds').map(String).filter(Boolean);

		if (!name)               return fail(400, { message: 'Name is required.',                        name, email, discordHandle, mobile });
		if (!email)              return fail(400, { message: 'Email is required.',                       name, email, discordHandle, mobile });
		if (!password)           return fail(400, { message: 'Password is required.',                    name, email, discordHandle, mobile });
		if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters.', name, email, discordHandle, mobile });

		try {
			const user = await transactions.registerUser({
				name,
				email,
				password,
				discordHandle: discordHandle || undefined,
				mobile:        mobile        || undefined,
				roleIds,
				createdBy: locals.user!.id,
			});

			// Send welcome email with account activation link (forgot-password flow).
			// better-auth's sendVerificationEmail API cannot be called for other users
			// from an admin session — the welcome email directs users to /forgot-password
			// where they can set their own password and verify their account.
			sendWelcomeEmail(email, name).catch(err =>
				console.error('[email] Failed to send welcome email to', email, err)
			);

			redirect(302, `/users/${user.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message, name, email, discordHandle, mobile });
			throw e;
		}
	},
};