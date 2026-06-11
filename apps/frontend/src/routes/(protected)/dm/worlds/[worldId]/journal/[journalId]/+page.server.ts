// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/[journalId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { news, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

const VISIBILITY_OPTIONS = ['PUBLIC', 'WORLD', 'DM_ONLY', 'ADMIN_ONLY'] as const;

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { canManage } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const journals = await news.worldJournals.getAll(params.worldId);
	const journal  = journals.find(j => j.id === params.journalId);
	if (!journal) throw error(404, 'Journal not found');

	const activePageId = url.searchParams.get('page') ?? null;
	const activePage   = activePageId ? await news.worldJournals.getPage(activePageId) : null;

	return { journal, activePage, canManage, worldId: params.worldId, visibilityOptions: VISIBILITY_OPTIONS };
};

export const actions: Actions = {
	updateJournal: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const title       = data.get('title')?.toString().trim()       ?? '';
		const icon        = data.get('icon')?.toString().trim()        || null;
		const description = data.get('description')?.toString().trim() || null;
		const isPublished = data.get('isPublished') === 'true';
		const visibility  = data.get('visibility')?.toString() as any  ?? 'PUBLIC';
		try {
			await news.worldJournals.update(params.journalId, { title, icon, description, isPublished, visibility }, locals.user!.id);
			return { success: true, action: 'journal' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createSection: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data       = await request.formData();
		const title      = data.get('title')?.toString().trim()  ?? 'New Section';
		const icon       = data.get('icon')?.toString().trim()   || undefined;
		const visibility = data.get('visibility')?.toString() as any ?? 'PUBLIC';
		await news.worldJournals.createSection({ journalId: params.journalId, title, icon, visibility }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	updateSection: async ({ request, locals, params }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data       = await request.formData();
		const id         = data.get('id')?.toString()            ?? '';
		const title      = data.get('title')?.toString().trim()  ?? '';
		const icon       = data.get('icon')?.toString().trim()   || null;
		const sortOrder  = Number(data.get('sortOrder')          ?? 0);
		const visibility = data.get('visibility')?.toString() as any ?? 'PUBLIC';
		await news.worldJournals.updateSection(id, { title, icon, sortOrder, visibility }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	deleteSection: async ({ request, locals, params }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		await news.worldJournals.deleteSection(id, locals.user!.id);
		return { success: true, action: 'section' };
	},

	createPage: async ({ request, locals, params }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const sectionId = data.get('sectionId')?.toString()     ?? '';
		const title     = data.get('title')?.toString().trim()  ?? 'New Page';
		const newPage = await news.worldJournals.createPage({ sectionId, title }, locals.user!.id);
		return { success: true, action: 'page', newPageId: (newPage as any).id ?? null };
	},

	savePage: async ({ request, locals, params }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const id      = data.get('id')?.toString()      ?? '';
		const title   = data.get('title')?.toString()   ?? '';
		const content = data.get('content')?.toString() ?? '';
		await news.worldJournals.updatePage(id, { title, content }, locals.user!.id);
		return { success: true, action: 'pageSaved' };
	},

	deletePage: async ({ request, locals, params }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		await news.worldJournals.deletePage(id, locals.user!.id);
		return { success: true, action: 'pageDeleted' };
	},
};