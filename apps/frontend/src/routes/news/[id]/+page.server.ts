// apps/frontend/src/routes/news/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import { news } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const a = await news.announcements.getById(params.id);
	if (!a || !a.isPublished) throw error(404, 'Announcement not found');
	const { tokens } = await news.enrichers.resolve(a.content);
	return { announcement: { ...a, tokens } };
};