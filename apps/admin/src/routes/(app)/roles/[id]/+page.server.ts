// apps/admin/src/routes/(app)/roles/[id]/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import { roles, platform } from '@core/database';
import { assertListPermission, assertWritePermission, invalidateRolePermissions } from '@core/rbac';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Roles require ALL to read — OWN makes no sense for roles
	try {
		assertListPermission(locals.permissions, 'Role', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	const [role, modules] = await Promise.all([
		roles.getWithPermissions(params.id),
		platform.getResources(),
	]);
	if (!role) throw error(404, 'Role not found');

	const permMap = Object.fromEntries(
		role.permissions.map(p => [p.resourceKey, {
			canCreate: p.canCreate,
			canRead:   p.canRead,
			canUpdate: p.canUpdate,
			canDelete: p.canDelete,
		}])
	);

	return { role, modules, permMap };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		try {
			assertWritePermission(locals.permissions, 'Permission', 'update');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const role = await roles.getWithPermissions(params.id);
		if (role?.name === 'SUPERADMIN') return fail(403, { message: 'SUPERADMIN permissions cannot be modified.' });

		const data = await request.formData();
		const raw  = data.get('permissions')?.toString();
		if (!raw) return fail(400, { message: 'No permission data received.' });

		try {
			const permissions = JSON.parse(raw);
			await roles.updatePermissions(params.id, permissions, locals.user!.id);
			await invalidateRolePermissions(params.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ params, locals }) => {
		try {
			assertWritePermission(locals.permissions, 'Role', 'delete');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		try {
			await roles.delete(params.id, locals.user!.id);
			redirect(302, '/roles');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};