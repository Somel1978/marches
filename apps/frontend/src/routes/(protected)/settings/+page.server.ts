// apps/frontend/src/routes/(protected)/settings/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const successMsg = url.searchParams.get('success') ?? null;
	const errorMsg   = url.searchParams.get('error')   ?? null;
	return {
		user: locals.user,
		successMsg,
		errorMsg,
	};
};
