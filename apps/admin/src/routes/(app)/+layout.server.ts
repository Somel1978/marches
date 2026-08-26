// apps/admin/src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import { platform, notifications } from '@core/database';
import { NAV_ITEMS, FOOTER_ITEMS } from '$lib/nav';
import type { NavItemDef, NavContext, ResolvedNavItem } from '$lib/nav';
import type { LayoutServerLoad } from './$types';

function resolveNavItems(
    items:       NavItemDef[],
    permissions: App.Locals['permissions'],
    userId:      string,
    pathname:    string,
): ResolvedNavItem[] {
    return items
        .filter(item => {
            // Section labels always show
            if (item.type === 'section') return true;
            if (item.resourceKey === null) return true;
            return checkPermission(permissions, { resourceKey: item.resourceKey!, action: 'read' }).allowed;
        })
        .map(item => {
            // Pass section labels through unchanged
            if (item.type === 'section') {
                return { type: 'section' as const, label: item.label };
            }

            // Build context with resolved permission level for this resource
            const level = item.resourceKey
                ? (checkPermission(permissions, { resourceKey: item.resourceKey, action: 'read' }).level as 'NONE' | 'OWN' | 'ALL')
                : 'ALL';

            const ctx: NavContext = { userId, level };

            const href = typeof item.href === 'function' ? item.href(ctx) : item.href;

            // activeMatch: function → call it; string → prefix match; default → startsWith(href)
            const active = item.activeMatch
                ? typeof item.activeMatch === 'function'
                    ? item.activeMatch(pathname, ctx)
                    : pathname.startsWith(item.activeMatch)
                : pathname.startsWith(href);

            // Resolve children — supports dynamic href and activeMatch per child
            const children = item.children?.map(child => {
                const childHref = typeof child.href === 'function' ? child.href(ctx) : child.href;

                const childActive = child.activeMatch
                    ? typeof child.activeMatch === 'function'
                        ? child.activeMatch(pathname, ctx)
                        : pathname.startsWith(child.activeMatch)
                    : pathname === childHref || pathname.startsWith(childHref + '/');

                return { label: child.label, href: childHref, active: childActive };
            });

            return { type: 'item' as const, label: item.label, icon: item.icon, href, active, children };
        });
}

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const redirectTo = url.pathname !== '/' ? `?redirectTo=${encodeURIComponent(url.pathname)}` : '';
		redirect(302, `/login${redirectTo}`);
	}

	const canAccessAdmin = checkPermission(locals.permissions, {
		resourceKey: 'System',
		action:      'read',
	});
	if (!canAccessAdmin.allowed) redirect(302, '/unauthorized');

	const [settingsMap, unread] = await Promise.all([
		platform.getSettingsMap(),
		notifications.getUnread(locals.user.id),
	]);

	return {
		siteName:      settingsMap['site.name']    ?? 'Admin',
		siteLogo:      settingsMap['site.logo']    ?? '',
		siteLogoIcon:  settingsMap['site.logoIcon'] ?? '⚔',
		// Cookie mirrors the value applied by app.html's inline script before
		// paint — avoids a DB round trip on every layout load just to know
		// which option to highlight in the theme toggle.
		theme: cookies.get('adminTheme') ?? 'admin',
		user: {
			id:    locals.user.id,
			name:  locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
		},
		notifications: unread,
		notifCount:    unread.length,
		nav:    resolveNavItems(NAV_ITEMS,    locals.permissions, locals.user.id, url.pathname),
		footer: resolveNavItems(FOOTER_ITEMS, locals.permissions, locals.user.id, url.pathname),
	};
};