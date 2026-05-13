import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getUserPermissions } from '@core/rbac';

// ─── Auth handler ─────────────────────────────────────────────────────────────
// Hydrates session and user from the request cookie/header,
// then loads the full permission map for the user in a single DB query.
// All route load functions get permissions for free via event.locals.permissions.
const handleAuth: Handle = async ({ event, resolve }) => {
	// Always initialise to an empty Map so routes never have to null-check.
	event.locals.permissions = new Map();

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.user       = session.user;
		event.locals.session    = session.session;
		event.locals.permissions = await getUserPermissions(session.user.id);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// sequence() makes it easy to add future handlers (logging, rate-limiting, etc.)
// without touching this file — just append to the array.
export const handle: Handle = sequence(handleAuth);