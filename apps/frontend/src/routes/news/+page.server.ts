// apps/frontend/src/routes/news/+page.server.ts
import { news } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const type = url.searchParams.get('type') ?? undefined;
	const tag  = url.searchParams.get('tag')  ?? undefined;
	const announcements = await news.announcements.getPublic({ type, tag });
	return { announcements, type, tag };
};