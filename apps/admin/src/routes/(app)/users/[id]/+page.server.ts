// apps/admin/src/routes/(app)/users/[id]/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import { users, roles } from '@core/database';
import { assertRecordPermission, assertWritePermission, assertListPermission, invalidateUserPermissions } from '@core/rbac';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [user, allRoles] = await Promise.all([
		users.getById(params.id),
		roles.getAll(),
	]);
	if (!user) throw error(404, 'User not found');

	try {
		assertRecordPermission(locals.permissions, 'User', 'read', user.id, locals.user!.id);
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	const canReadAllRoles = (() => {
		try { assertListPermission(locals.permissions, 'Role', 'read'); return true; }
		catch { return false; }
	})();

	const isSelf = locals.user!.id === params.id;

	return {
		user,
		allRoles: canReadAllRoles ? allRoles : [],
		isSelf,
		canEditRoles:   canReadAllRoles,
		canDeleteUser:  !isSelf,
	};
};

export const actions: Actions = {
	updateProfile: async ({ params, request, locals }) => {
		const user = await users.getById(params.id);
		if (!user) return fail(404, { message: 'User not found.' });

		try {
			assertWritePermission(locals.permissions, 'User', 'update', user.id, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const data          = await request.formData();
		const name          = data.get('name')?.toString().trim()          ?? '';
		const email         = data.get('email')?.toString().trim()         ?? '';
		const image         = data.get('image')?.toString().trim()         ?? '';
		const discordHandle = data.get('discordHandle')?.toString().trim() ?? '';
		const mobile        = data.get('mobile')?.toString().trim()        ?? '';
		const emailVerified = data.get('emailVerified') === 'true';

		if (!name)  return fail(400, { message: 'Name is required.' });
		if (!email) return fail(400, { message: 'Email is required.' });

		try {
			await users.update(params.id, {
				name,
				email,
				image,         // empty string → dbapi converts to null
				discordHandle, // empty string → dbapi converts to null
				mobile,        // empty string → dbapi converts to null
				emailVerified,
				actorId: locals.user!.id,
			});
			return { profileSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	resetPassword: async ({ params, request, locals }) => {
		const user = await users.getById(params.id);
		if (!user) return fail(404, { message: 'User not found.' });

		try {
			assertWritePermission(locals.permissions, 'User', 'update', user.id, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const data     = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		if (!password)           return fail(400, { message: 'Password is required.' });
		if (password.length < 8) return fail(400, { message: 'Password must be at least 8 characters.' });

		try {
			await users.setPassword(params.id, password, locals.user!.id);
			return { passwordSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateRoles: async ({ params, request, locals }) => {
		try {
			assertListPermission(locals.permissions, 'Role', 'read');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const data    = await request.formData();
		const roleIds = data.getAll('roleIds').map(String);

		try {
			await roles.setUserRoles(params.id, roleIds, locals.user!.id);
			invalidateUserPermissions(params.id);
			return { rolesSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteUser: async ({ params, locals }) => {
		try {
			assertWritePermission(locals.permissions, 'User', 'delete');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		try {
			await users.delete(params.id, locals.user!.id);
			invalidateUserPermissions(params.id);
			redirect(302, '/users');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};