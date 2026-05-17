// apps/frontend/src/routes/(protected)/profile/+page.server.ts
import { fail } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import { users } from '@core/database';
import { assertRecordPermission } from '@core/rbac';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Always fetch fresh from DB — session may have stale email after email change
	const user         = await users.getById(locals.user!.id);
	const emailChanged = url.searchParams.get('emailChanged') === '1';
	return { user: user!, emailChanged };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		try {
			assertRecordPermission(
				locals.permissions, 'User', 'update',
				locals.user!.id, locals.user!.id
			);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { profileMessage: e.message });
			throw e;
		}

		const data          = await request.formData();
		const name          = data.get('name')?.toString().trim()          ?? '';
		const image         = data.get('image')?.toString().trim()         ?? '';
		const discordHandle = data.get('discordHandle')?.toString().trim() ?? '';
		const mobile        = data.get('mobile')?.toString().trim()        ?? '';

		if (!name) return fail(400, { profileMessage: 'Name is required.' });

		try {
			await users.update(locals.user!.id, {
				name,
				image:         image         || undefined,
				discordHandle: discordHandle || undefined,
				mobile:        mobile        || undefined,
				actorId:       locals.user!.id,
			});
			return { profileSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { profileMessage: e.message });
			throw e;
		}
	},

	changePassword: async ({ request, locals }) => {
		const data            = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString() ?? '';
		const newPassword     = data.get('newPassword')?.toString()     ?? '';

		if (!currentPassword) return fail(400, { passwordMessage: 'Current password is required.' });
		if (!newPassword)     return fail(400, { passwordMessage: 'New password is required.' });
		if (newPassword.length < 8) return fail(400, { passwordMessage: 'New password must be at least 8 characters.' });
		if (currentPassword === newPassword) return fail(400, { passwordMessage: 'New password must be different from current password.' });

		try {
			await auth.api.changePassword({
				body:    { currentPassword, newPassword, revokeOtherSessions: false },
				headers: request.headers,
			});
			return { passwordSuccess: true };
		} catch (e) {
			if (e instanceof APIError) {
				return fail(400, { passwordMessage: 'Current password is incorrect.' });
			}
			throw e;
		}
	},

	changeEmail: async ({ request, locals }) => {
		const data            = await request.formData();
		const newEmail        = data.get('newEmail')?.toString().trim() ?? '';
		const currentPassword = data.get('currentPassword')?.toString() ?? '';

		if (!newEmail)        return fail(400, { emailMessage: 'New email is required.' });
		if (!currentPassword) return fail(400, { emailMessage: 'Current password is required.' });
		if (newEmail === locals.user!.email) {
			return fail(400, { emailMessage: 'New email must be different from your current email.' });
		}

		// Verify current password first
		try {
			await auth.api.signInEmail({
				body: { email: locals.user!.email, password: currentPassword },
			});
		} catch (e) {
			if (e instanceof APIError) return fail(400, { emailMessage: 'Incorrect password.' });
			throw e;
		}

		try {
			await auth.api.changeEmail({
				body:    { newEmail, callbackURL: '/profile/email-changed' },
				headers: request.headers,
			});
			return { emailSuccess: true, newEmail };
		} catch (e) {
			if (e instanceof APIError) {
				return fail(400, { emailMessage: 'Could not initiate email change. Please try again.' });
			}
			throw e;
		}
	},
};