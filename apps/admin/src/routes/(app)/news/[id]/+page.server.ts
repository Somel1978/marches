// apps/admin/src/routes/(app)/news/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { news } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const a = await news.announcements.getById(params.id);
	if (!a) throw error(404, 'Announcement not found');
	return { announcement: a };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Announcement', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data         = await request.formData();
		const title        = data.get('title')?.toString().trim() ?? '';
		const content      = data.get('content')?.toString() ?? '';
		const type         = data.get('type')?.toString() ?? 'NEWS';
		const tags         = data.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) ?? [];
		const isPublished  = data.get('isPublished') === 'true';
		const scheduledRaw = data.get('scheduledAt')?.toString() || null;
		const expiresRaw   = data.get('expiresAt')?.toString()   || null;
		if (!title) return fail(400, { message: 'Title required.' });
		try {
			await news.announcements.update(params.id, {
				title, content, type, tags, isPublished,
				scheduledAt: scheduledRaw ? new Date(scheduledRaw) : null,
				expiresAt:   expiresRaw   ? new Date(expiresRaw)   : null,
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Announcement', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		await news.announcements.delete(params.id, locals.user!.id);
		return { deleted: true };
	},
};
