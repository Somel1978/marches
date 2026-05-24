// apps/admin/src/routes/(app)/journal/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { news } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return { journals: await news.journals.getAll() };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Journal', action: 'create' });
		if (!can.allowed) return { error: 'Forbidden' };
		const j = await news.journals.create({ title: 'New Journal' }, locals.user!.id);
		redirect(302, `/journal/${j.id}`);
	},
};
