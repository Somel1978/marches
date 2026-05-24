// apps/frontend/src/routes/(protected)/journal/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { news } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const roleIds  = ((locals.permissions as any)?.roles ?? []).map((r: any) => r.id ?? r).filter(Boolean);
	const charIds  = url.searchParams.getAll('worldId');
	const journals = await news.journals.getForUser(roleIds, charIds);

	// Redirect to first page if pageId provided
	const pageId = url.searchParams.get('page');
	if (pageId) {
		const page = await news.journals.getPage(pageId);
		if (page) {
			const { tokens } = await news.enrichers.resolve(page.content);
			return { journals, activePage: { ...page, tokens } };
		}
	}

	return { journals, activePage: null };
};