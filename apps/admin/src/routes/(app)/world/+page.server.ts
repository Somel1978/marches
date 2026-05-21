// apps/admin/src/routes/(app)/world/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	return { worlds: await worlds.getAll() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name is required.' });
		try {
			await worlds.create({ name, description: data.get('description')?.toString().trim() || undefined }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};