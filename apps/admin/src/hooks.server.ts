// apps/admin/src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getUserPermissions } from '@core/rbac';

const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session     = session.session;
		event.locals.user        = session.user;
		// Load and cache permissions for this request.
		// Permission cache (lru-cache) means this is only a DB query on cache miss.
		event.locals.permissions = await getUserPermissions(session.user.id);
	} else {
		event.locals.permissions = new Map();
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export { handle };