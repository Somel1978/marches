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

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { canManage } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const allJournals = await news.journals.getAll();
	const journal = (allJournals as any[]).find((j: any) => j.id === params.journalId);
	if (!journal) throw error(404, 'Journal not found');

	// Guard: journal must belong to this world
	if (!(journal.worldIds ?? []).includes(params.worldId)) throw error(403, 'This journal does not belong to your world.');

	const activePageId = url.searchParams.get('page') ?? null;
	const activePage   = activePageId ? await news.journals.getPage(activePageId) : null;

	return { journal, activePage, canManage };
};

export const actions: Actions = {
	updateJournal: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const title       = data.get('title')?.toString().trim() ?? '';
		const icon        = data.get('icon')?.toString().trim()  || null;
		const description = data.get('description')?.toString().trim() || null;
		const isPublished = data.get('isPublished') === 'true';
		try {
			// Keep worldIds locked to this world
			await news.journals.update(params.journalId, {
				title, icon, description, isPublished,
				worldIds: [params.worldId],
				roleIds:  [],
			}, locals.user!.id);
			return { success: true, action: 'journal' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createSection: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data  = await request.formData();
		const title = data.get('title')?.toString().trim() ?? 'New Section';
		const icon  = data.get('icon')?.toString().trim()  || undefined;
		await news.journals.createSection({ journalId: params.journalId, title, icon }, locals.user!.id);
		return { success: true, action: 'section' };
	},

	updateSection: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const id        = data.get('id')?.toString() ?? '';
		const title     = data.get('title')?.toString().trim() ?? '';
		const icon      = data.get('icon')?.toString().trim() || null;
		const sortOrder = Number(data.get('sortOrder') ?? 0);
		await news.journals.updateSection(id, { title, icon, sortOrder });
		return { success: true, action: 'section' };
	},

	deleteSection: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await news.journals.deleteSection(id);
		return { success: true, action: 'section' };
	},

	createPage: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const sectionId = data.get('sectionId')?.toString() ?? '';
		const title     = data.get('title')?.toString().trim() ?? 'New Page';
		await news.journals.createPage({ sectionId, title }, locals.user!.id);
		return { success: true, action: 'page' };
	},

	savePage: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const id      = data.get('id')?.toString() ?? '';
		const title   = data.get('title')?.toString().trim() ?? '';
		const content = data.get('content')?.toString() ?? '';
		await news.journals.updatePage(id, { title, content });
		return { success: true, action: 'pageSaved' };
	},

	deletePage: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await news.journals.deletePage(id);
		return { success: true, action: 'pageDeleted' };
	},
};
