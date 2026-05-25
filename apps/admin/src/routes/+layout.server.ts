// apps/admin/src/routes/+layout.server.ts
import { platform } from '@core/database';
import type { LayoutServerLoad } from './$types';

// Root layout — no auth guard here.
// Auth guard lives in (app)/+layout.server.ts so login/unauthorized routes are unprotected.
// Only loads site-wide settings available to all routes including auth pages.
export const load: LayoutServerLoad = async () => {
	const settings = await platform.getSettingsMap();
	return {
		siteName:     settings['site.name']     || 'Marches',
		siteLogo:     settings['site.logo']     || '',
		siteLogoIcon: settings['site.logoIcon'] || '⚔',
		siteFooter: settings['site.footer'] || '',
	};
};