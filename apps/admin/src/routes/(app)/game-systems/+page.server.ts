// apps/admin/src/routes/(app)/game-systems/+page.server.ts
import { gameSystems } from '@core/database';
import { assertListPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		assertListPermission(locals.permissions, 'GameSystem', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}
	return { gameSystems: await gameSystems.getAll() };
};
