// apps/admin/src/routes/(app)/roles/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import { roles } from '@core/database';
import { checkPermission } from '@core/rbac';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const canCreate = checkPermission(locals.permissions, { resourceKey: 'Role', action: 'create' });
	if (!canCreate.allowed) throw error(403, 'Forbidden');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const canCreate = checkPermission(locals.permissions, { resourceKey: 'Role', action: 'create' });
		if (!canCreate.allowed) return fail(403, { message: 'Forbidden', name: '', description: '' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const description = data.get('description')?.toString().trim() ?? '';

		if (!name) return fail(400, { message: 'Name is required.', name, description });

		try {
			const role = await roles.create({ name, description: description || undefined, actorId: locals.user!.id });
			redirect(302, `/roles/${role.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message, name, description });
			throw e;
		}
	},
};