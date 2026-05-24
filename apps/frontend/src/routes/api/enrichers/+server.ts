// apps/frontend/src/routes/api/enrichers/+server.ts
import { json } from '@sveltejs/kit';
import { news } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json([], { status: 401 });
	const q = url.searchParams.get('q') ?? '';
	if (q.length < 2) return json([]);
	const results = await news.enrichers.search(q);
	return json(results);
};
