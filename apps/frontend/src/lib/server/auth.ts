import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { createAuth } from '@core/rbac';

export const auth = createAuth({
    baseURL: env.ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
        github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET
        }
    },
    plugins: [
        sveltekitCookies(getRequestEvent)
    ]
});
