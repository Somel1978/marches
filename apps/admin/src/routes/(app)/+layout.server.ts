// apps/admin/src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname !== '/' ? `?redirectTo=${url.pathname}` : '';
		redirect(302, `/login${redirectTo}`);
	}

	const canAccessAdmin = checkPermission(locals.permissions, {
		resourceKey: 'System',
		action:      'read',
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