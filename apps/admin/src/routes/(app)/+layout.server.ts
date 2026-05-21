// apps/admin/src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { checkPermission, canNavigate } from '@core/rbac';
import { platform, notifications } from '@core/database';
import { NAV_ITEMS, FOOTER_ITEMS } from '$lib/nav';
import type { NavItemDef, NavContext, ResolvedNavItem } from '$lib/nav';
import type { LayoutServerLoad } from './$types';

function resolveNavItems(
    items:       NavItemDef[],
    permissions: App.Locals['permissions'],
    navVis:      Record<string, 'NONE' | 'ANY' | 'ALL'>,
    userId:      string,
    pathname:    string,
): ResolvedNavItem[] {
    return items
        .filter(item => {
            if (item.resourceKey === null) return true;
            return canNavigate(permissions, item.resourceKey, navVis[item.resourceKey] ?? 'NONE');
        })
        .map(item => {
            // Build context with resolved permission level for this resource
            const level = item.resourceKey
                ? (checkPermission(permissions, { resourceKey: item.resourceKey, action: 'read' }).level as 'NONE' | 'OWN' | 'ALL')
                : 'ALL';

            const ctx: NavContext = { userId, level };

            const href = typeof item.href === 'function' ? item.href(ctx) : item.href;

            const active = item.activeMatch
                ? typeof item.activeMatch === 'function'
                    ? item.activeMatch(pathname, ctx)
                    : pathname === item.activeMatch
                : pathname.startsWith(href);

            const children = item.children?.map(child => ({
                label:  child.label,
                href:   child.href,
                active: pathname === child.href || pathname.startsWith(child.href + '/'),
            }));

            return { label: item.label, icon: item.icon, href, active, children };
        });
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname !== '/' ? `?redirectTo=${encodeURIComponent(url.pathname)}` : '';
		redirect(302, `/login${redirectTo}`);
	}

	const canAccessAdmin = checkPermission(locals.permissions, {
		resourceKey: 'System',
		action:      'read',
	});
	if (!canAccessAdmin.allowed) redirect(302, '/unauthorized');

	const navVis = await platform.getResourceNavVisibility();

	const unread = await notifications.getUnread(locals.user.id);

	return {
		user: {
			id:    locals.user.id,
			name:  locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
		},
		notifications: unread,
		notifCount:    unread.length,
		nav:    resolveNavItems(NAV_ITEMS,    locals.permissions, navVis, locals.user.id, url.pathname),
		footer: resolveNavItems(FOOTER_ITEMS, locals.permissions, navVis, locals.user.id, url.pathname),
	};
};