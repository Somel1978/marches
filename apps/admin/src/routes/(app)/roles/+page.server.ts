// apps/admin/src/routes/(app)/roles/+page.server.ts
import { roles } from '@core/database';
import { assertListPermission } from '@core/rbac';
import { error } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		assertListPermission(locals.permissions, 'Role', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	return { roles: await roles.getAll() };
};