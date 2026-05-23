// apps/admin/src/routes/(app)/rewards/achievements/+page.server.ts
import { fail } from '@sveltejs/kit';
import { achievements, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return { achievements: await achievements.getAll() };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Achievement', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name        = data.get('name')?.toString().trim() ?? '';
		const description = data.get('description')?.toString().trim() || undefined;
		const icon        = data.get('icon')?.toString().trim() || undefined;
		if (!name) return fail(400, { message: 'Name is required.' });
		try {
			await achievements.create({ name, description, icon }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	toggle: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Achievement', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data  = await request.formData();
		const id    = data.get('id')?.toString() ?? '';
		const isActive = data.get('isActive') === 'true';
		try {
			await achievements.update(id, { isActive: !isActive }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
