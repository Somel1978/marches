// apps/frontend/src/routes/(protected)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${url.pathname}`);
	}
	return {
		user: {
			id:            locals.user.id,
			name:          locals.user.name,
			email:         locals.user.email,
			image:         locals.user.image,
			discordHandle: (locals.user as any).discordHandle ?? null,
			mobile:        (locals.user as any).mobile        ?? null,
		},
	};
};