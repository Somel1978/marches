import { createAuth } from '@core/rbac';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';

/**
 * Admin auth instance.
 * Config lives in @core/rbac — this file only injects env vars
 * and the SvelteKit-specific cookie plugin.
 */
export const auth = createAuth({
    baseURL: env.ORIGIN,
    secret:  env.BETTER_AUTH_SECRET,
    github: {
        clientId:     env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    plugins: [sveltekitCookies(getRequestEvent)],
});