// apps/frontend/src/lib/server/auth.ts
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getBaseAuthConfig } from '@core/rbac';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeEmail } from '@core/email';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	...getBaseAuthConfig({
		allowedHosts:   env.ALLOWED_HOSTS   ?? '10.0.0.183',
		publicURL:      env.SITE_URL      ?? 'http://10.0.0.183:5173',
		trustedOrigins: env.TRUSTED_ORIGINS ?? '',
		secret:         env.BETTER_AUTH_SECRET,
		emailSender: {
			sendWelcome:      sendWelcomeEmail,
			sendVerification: sendVerificationEmail,
			sendReset:        sendPasswordResetEmail,
			sendEmailChange:  sendEmailChangeEmail,
		},
		...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && {
			github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
		}),
		plugins: [sveltekitCookies(getRequestEvent)],
	}),
});