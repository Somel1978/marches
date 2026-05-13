// apps/frontend/src/routes/(protected)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Guard for all (protected) player routes.
// Public routes (landing, quest browse, map) live outside this group.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `?redirectTo=${url.pathname}`;
		redirect(302, `/login${redirectTo}`);
	}

	return {
		user: {
			id:    locals.user.id,
			name:  locals.user.name,
			image: locals.user.image,
		},
	};
};
