// apps/admin/src/routes/(app)/users/+page.server.ts
import { users } from '@core/database';
import { assertListPermission } from '@core/rbac';
import { error } from '@sveltejs/kit';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		assertListPermission(locals.permissions, 'User', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	const search = url.searchParams.get('q')    ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);

	return {
		...(await users.getAll({ search, page, perPage: 20 })),
		search: search ?? '',
	};
};