// apps/frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { dms, platform, notifications } from '@core/database';

// Public layout — no auth guard.
// Passes user to layout so NavBar can show login/profile links.
export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = await platform.getSettingsMap();
	const siteName   = settings['site.name']   || '';
	const siteLogo     = settings['site.logo']     || '';
	const siteLogoIcon = settings['site.logoIcon'] || '⚔';
	const siteFooter = settings['site.footer'] || '';

	if (!locals.user) return { user: null, siteName, siteLogo, siteLogoIcon, siteFooter, notifications: [], notifCount: 0 };

	const [dmProfile, unread] = await Promise.all([
		dms.profiles.getByUserId(locals.user.id),
		notifications.getUnread(locals.user.id),
	]);

	return {
		siteName,
		siteLogo,
		siteLogoIcon,
		siteFooter,
		notifications: unread,
		notifCount:    unread.length,
		user: {
			id:           locals.user.id,
			name:         locals.user.name,
			email:        locals.user.email,
			image:        locals.user.image,
			hasDMProfile: !!(dmProfile?.isActive),
		},
	};
};