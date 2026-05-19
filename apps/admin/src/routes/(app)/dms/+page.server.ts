// apps/admin/src/routes/(app)/dms/+page.server.ts
import { dms } from '@core/database';
import { assertListPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		assertListPermission(locals.permissions, 'DMProfile', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}
	return { profiles: await dms.profiles.getAll() };
};
