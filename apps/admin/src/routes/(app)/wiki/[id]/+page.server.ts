// apps/admin/src/routes/(app)/wiki/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { news } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

const VISIBILITY_OPTIONS = ['PUBLIC', 'DM_ONLY', 'ADMIN_ONLY'] as const;

export const load: PageServerLoad = async ({ params, url }) => {
	const wiki = await news.wiki.getById(params.id);
	if (!wiki) throw error(404, 'Wiki not found');
	const activePageId = url.searchParams.get('page') ?? null;
	const activePage   = activePageId ? await news.wiki.getPage(activePageId) : null;
	return { wiki, activePage, visibilityOptions: VISIBILITY_OPTIONS };
};

export const actions: Actions = {
	updateWiki: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Journal', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const title       = data.get('title')?.toString().trim()       ?? '';
		const icon        = data.get('icon')?.toString().trim()        || null;
		const description = data.get('description')?.toString().trim() || null;
		const isPublished = data.get('isPublished') === 'true';
		const visibility  = data.get('visibility')?.toString() as any  ?? 'PUBLIC';
		try {
			await news.wiki.update(params.id, { title, icon, description, isPublished, visibility }, locals.user!.id);
			return { success: true, action: 'wiki' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createSection: async ({ params, request, locals }) => {
		const data       = await request.formData();
		const title      = data.get('title')?.toString().trim()   ?? 'New Section';
		const icon       = data.get('icon')?.toString().trim()    || undefined;
		const visibility = data.get('visibility')?.toString() as any ?? 'PUBLIC';
		await news.wiki.createSection({ wikiId: params.id, title, icon, visibility }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	updateSection: async ({ request, locals }) => {
		const data       = await request.formData();
		const id         = data.get('id')?.toString()             ?? '';
		const title      = data.get('title')?.toString().trim()   ?? '';
		const icon       = data.get('icon')?.toString().trim()    || null;
		const sortOrder  = Number(data.get('sortOrder')           ?? 0);
		const visibility = data.get('visibility')?.toString() as any ?? 'PUBLIC';
		await news.wiki.updateSection(id, { title, icon, sortOrder, visibility }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	deleteSection: async ({ request, locals }) => {
		const id = (await request.formData()).get('id')?.toString() ?? '';
		await news.wiki.deleteSection(id, locals.user!.id);
		return { success: true, action: 'section' };
	},

	createPage: async ({ request, locals }) => {
		const data      = await request.formData();
		const sectionId = data.get('sectionId')?.toString()       ?? '';
		const title     = data.get('title')?.toString().trim()    ?? 'New Page';
		await news.wiki.createPage({ sectionId, title }, locals.user!.id);
		return { success: true, action: 'page' };
	},

	savePage: async ({ request, locals }) => {
		const data    = await request.formData();
		const id      = data.get('id')?.toString()      ?? '';
		const title   = data.get('title')?.toString()   ?? '';
		const content = data.get('content')?.toString() ?? '';
		await news.wiki.updatePage(id, { title, content }, locals.user!.id);
		return { success: true, action: 'pageSaved' };
	},

	deletePage: async ({ request, locals }) => {
		const id = (await request.formData()).get('id')?.toString() ?? '';
		await news.wiki.deletePage(id, locals.user!.id);
		return { success: true, action: 'pageDeleted' };
	},
};