// apps/admin/src/routes/(app)/characters/+page.server.ts
import { characters } from '@core/database';
import { assertListPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	try {
		assertListPermission(locals.permissions, 'Character', 'read');
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}
	const status = url.searchParams.get('status') ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);
	return await characters.getAll({ status, page, perPage: 20 });
};

export const actions: Actions = {
	clearRest: async ({ locals }) => {
		try {
			assertListPermission(locals.permissions, 'Character', 'update');
		} catch (e) {
			return fail(403, { message: 'Not allowed.' });
		}
		const count = await characters.clearExpiredRest();
		return { clearRestSuccess: true, count };
	},
};