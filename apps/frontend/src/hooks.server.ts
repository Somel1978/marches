// apps/frontend/src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getUserPermissions } from '@core/rbac';

// ─── Auth handler ─────────────────────────────────────────────────────────────
// Hydrates session and user from the request cookie/header,
// then loads the full permission map for the user in a single DB query.
// Unauthenticated requests get an empty Map — public routes work normally,
// protected routes check permissions and throw error(403) themselves.
const handleAuth: Handle = async ({ event, resolve }) => {
	// Always initialise to an empty Map so routes never have to null-check.
	event.locals.permissions = new Map();

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.user        = session.user;
		event.locals.session     = session.session;
		event.locals.permissions = await getUserPermissions(session.user.id);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleAuth);