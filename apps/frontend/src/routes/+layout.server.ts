// apps/frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

// Public layout — no auth guard.
// Passes user to layout so NavBar can show login/profile links.
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
			? { id: locals.user.id, name: locals.user.name, email: locals.user.email, image: locals.user.image }
			: null,
	};
};