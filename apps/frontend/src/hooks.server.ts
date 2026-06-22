// apps/frontend/src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getUserPermissions } from '@core/rbac';
import { users } from '@core/database';

const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session     = session.session;
		event.locals.user        = session.user;
		event.locals.permissions = await getUserPermissions(session.user.id);

		// Seed the theme cookie from DB if not yet set.
		// The inline script in app.html reads this cookie before paint — no flash.
		if (!event.cookies.get('userTheme')) {
			const dbUser = await users.getById(session.user.id);
			const theme  = dbUser?.theme ?? 'frontend';
			event.cookies.set('userTheme', theme, {
				path: '/', maxAge: 60 * 60 * 24 * 365,
				httpOnly: false, sameSite: 'lax',
			});
		}
	} else {
		event.locals.permissions = new Map();
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export { handle };