// apps/admin/src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import type { LayoutServerLoad } from './$types';

// Guard for all (app) routes — runs after the root layout (which has no guard).
// (auth) routes like /login and /unauthorized are outside this group
// and therefore never hit this guard.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
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

	return {
		user: {
			id:    locals.user.id,
			name:  locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
		},
	};
};
