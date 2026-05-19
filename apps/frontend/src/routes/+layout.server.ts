// apps/frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { dms } from '@core/database';

// Public layout — no auth guard.
// Passes user to layout so NavBar can show login/profile links.
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };

	const dmProfile = await dms.profiles.getByUserId(locals.user.id);

	return {
		user: {
			id:           locals.user.id,
			name:         locals.user.name,
			email:        locals.user.email,
			image:        locals.user.image,
			hasDMProfile: !!(dmProfile?.isActive),
		},
	};
};