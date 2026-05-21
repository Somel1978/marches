// apps/frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { dms, platform } from '@core/database';

// Public layout — no auth guard.
// Passes user to layout so NavBar can show login/profile links.
export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = await platform.getSettingsMap();
	const siteName = settings['site.name'] || 'Marches';
	const siteLogo = settings['site.logo'] || '';

	if (!locals.user) return { user: null, siteName, siteLogo };

	const dmProfile = await dms.profiles.getByUserId(locals.user.id);

	return {
		siteName,
		siteLogo,
		user: {
			id:           locals.user.id,
			name:         locals.user.name,
			email:        locals.user.email,
			image:        locals.user.image,
			hasDMProfile: !!(dmProfile?.isActive),
		},
	};
};