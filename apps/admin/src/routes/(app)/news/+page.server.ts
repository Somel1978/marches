// apps/admin/src/routes/(app)/news/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { news } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { announcements: await news.announcements.getAll() };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Announcement', action: 'create' });
		if (!can.allowed) return { error: 'Forbidden' };
		const a = await news.announcements.create({ title: 'New announcement', content: '', type: 'NEWS' }, locals.user!.id);
		redirect(302, `/news/${a.id}`);
	},
};
