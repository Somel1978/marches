// apps/admin/src/routes/(app)/journal/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { news, worlds, roles } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const journal = await news.journals.getAll().then(all => all.find(j => j.id === params.id));
	if (!journal) throw error(404, 'Journal not found');
	const [allWorlds, allRoles] = await Promise.all([worlds.getAll(), roles.getAll()]);
	const activePageId = url.searchParams.get('page') ?? null;
	const activePage   = activePageId
		? await news.journals.getPage(activePageId)
		: null;
	return { journal, allWorlds, allRoles, activePage };
};

export const actions: Actions = {
	updateJournal: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Journal', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const title       = data.get('title')?.toString().trim() ?? '';
		const icon        = data.get('icon')?.toString().trim()  || null;
		const description = data.get('description')?.toString().trim() || null;
		const isPublished = data.get('isPublished') === 'true';
		const worldIds    = data.getAll('worldIds').map(v => v.toString());
		const roleIds     = data.getAll('roleIds').map(v => v.toString());
		await news.journals.update(params.id, { title, icon, description, isPublished, worldIds, roleIds }, locals.user!.id);
		return { success: true, action: 'journal' };
	},

	createSection: async ({ params, request, locals }) => {
		const data  = await request.formData();
		const title = data.get('title')?.toString().trim() ?? 'New Section';
		const icon  = data.get('icon')?.toString().trim()  || undefined;
		await news.journals.createSection({ journalId: params.id, title, icon }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	updateSection: async ({ request, locals }) => {
		const data      = await request.formData();
		const id        = data.get('id')?.toString() ?? '';
		const title     = data.get('title')?.toString().trim() ?? '';
		const icon      = data.get('icon')?.toString().trim() || null;
		const sortOrder = Number(data.get('sortOrder') ?? 0);
		await news.journals.updateSection(id, { title, icon, sortOrder });
		return { success: true, action: 'section' };
	},

	deleteSection: async ({ request, locals }) => {
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await news.journals.deleteSection(id);
		return { success: true, action: 'section' };
	},

	createPage: async ({ request, locals }) => {
		const data      = await request.formData();
		const sectionId = data.get('sectionId')?.toString() ?? '';
		const title     = data.get('title')?.toString().trim() ?? 'New Page';
		await news.journals.createPage({ sectionId, title }, locals.user!.id);
		return { success: true, action: 'page' };
	},

	savePage: async ({ request, locals }) => {
		const data    = await request.formData();
		const id      = data.get('id')?.toString() ?? '';
		const title   = data.get('title')?.toString().trim() ?? '';
		const content = data.get('content')?.toString() ?? '';
		await news.journals.updatePage(id, { title, content });
		return { success: true, action: 'pageSaved' };
	},

	deletePage: async ({ request, locals }) => {
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await news.journals.deletePage(id);
		return { success: true, action: 'pageDeleted' };
	},
};