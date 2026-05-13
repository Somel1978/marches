// apps/frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

// Root layout load — no auth guard (frontend is public-first).
// Passes minimal user info to the NavBar so it can show the right actions.
// Protected sub-routes have their own guard in (protected)/+layout.server.ts.
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
			? {
					id:    locals.user.id,
					name:  locals.user.name,
					image: locals.user.image,
				}
			: null,
	};
};
