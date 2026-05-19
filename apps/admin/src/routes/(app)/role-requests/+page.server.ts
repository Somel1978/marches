// apps/admin/src/routes/(app)/role-requests/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { dms } from '@core/database';
import { assertListPermission, checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		assertListPermission(locals.permissions, 'RoleRequest', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(403, 'Forbidden');
		throw e;
	}
	return { requests: await dms.roleRequests.getAll() };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'RoleRequest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		const note = data.get('note')?.toString().trim();

		try {
			await dms.roleRequests.approve(id, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'RoleRequest', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';

		try {
			await dms.roleRequests.delete(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'RoleRequest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const id   = data.get('id')?.toString()             ?? '';
		const note = data.get('note')?.toString().trim()    ?? '';

		if (!note) return fail(400, { message: 'Review note is required when rejecting.' });

		try {
			await dms.roleRequests.reject(id, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};