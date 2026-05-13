// apps/frontend/src/lib/server/auth.ts
import { createAuth } from '@core/rbac';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
 
export const auth = createAuth({
	baseURL: env.ORIGIN,
	secret:  env.BETTER_AUTH_SECRET,
	// Only enable GitHub when real credentials are provided.
	// Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env to activate.
	...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && {
		github: {
			clientId:     env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
	}),
	plugins: [sveltekitCookies(getRequestEvent)],
});
 