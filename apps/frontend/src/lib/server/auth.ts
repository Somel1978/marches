// apps/frontend/src/lib/server/auth.ts
import { createAuth } from '@core/rbac';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeEmail } from '@core/email';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';

export const auth = createAuth({
	baseURL:      env.ORIGIN ?? env.FRONTEND_URL ?? 'http://localhost:5173',
	secret:       env.BETTER_AUTH_SECRET,
	frontendURL:  env.FRONTEND_URL ?? 'http://localhost:5173',
	trustedOrigins: env.TRUSTED_ORIGINS
		? env.TRUSTED_ORIGINS.split(',').map((o: string) => o.trim()).filter(Boolean)
		: [],
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
});