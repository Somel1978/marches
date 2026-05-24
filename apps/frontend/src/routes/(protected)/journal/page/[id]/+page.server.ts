// apps/frontend/src/routes/(protected)/journal/page/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import { news } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const page = await news.journals.getPage(params.id);
	if (!page) throw error(404, 'Page not found');

	const roleIds  = ((locals.permissions as any)?.roles ?? []).map((r: any) => r.id ?? r).filter(Boolean);
	const journals = await news.journals.getForUser(roleIds, []);

	// Resolve enrichers
	const { tokens } = await news.enrichers.resolve(page.content);

	return { journals, activePage: { ...page, tokens } };
};