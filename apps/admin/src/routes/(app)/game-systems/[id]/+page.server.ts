// apps/admin/src/routes/(app)/game-systems/+page.server.ts
import { fail } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const systems = await gameSystems.getAll();
	return { systems };
};

export const actions: Actions = {
	toggleActive: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const id       = data.get('id')?.toString() ?? '';
		const isActive = data.get('isActive') === 'true';
		try {
			await gameSystems.update(id, { isActive }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};