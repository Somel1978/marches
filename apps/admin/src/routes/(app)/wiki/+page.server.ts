// apps/admin/src/routes/(app)/wiki/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { news } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return { wikis: await news.wiki.getAll() };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Journal', action: 'create' });
		if (!can.allowed) return { error: 'Forbidden' };
		const w = await news.wiki.create({ title: 'New Wiki' }, locals.user!.id);
		redirect(302, `/wiki/${w.id}`);
	},
};