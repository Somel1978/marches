// apps/admin/src/routes/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import type { LayoutServerLoad } from './$types';

//  Admin layout guard
// Runs for every route in apps/admin. Ensures:
//   1. The user is authenticated  redirect to /login
//   2. The user has System access redirect to /unauthorized
//
// event.locals.permissions is already populated by hooks.server.ts 
// no extra DB call needed here.
//
// TODO: create apps/admin/src/routes/login/+page.svelte
// TODO: create apps/admin/src/routes/unauthorized/+page.svelte
// 
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		// Preserve the intended destination so login can redirect back after auth.
		const redirectTo = url.pathname !== '/' ? `?redirectTo=${url.pathname}` : '';
		redirect(302, `/login${redirectTo}`);
	}

	const canAccessAdmin = checkPermission(locals.permissions, {
		resource: 'System',
		action:   'read',
	});

	if (!canAccessAdmin.allowed) {
		redirect(302, '/unauthorized');
	}

	// Expose minimal user info to all admin layouts and pages.
	// Never expose the full permissions map to the client.
	return {
		user: {
			id:    locals.user.id,
			name:  locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
		},
	};
};
