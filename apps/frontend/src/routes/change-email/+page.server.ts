// apps/frontend/src/routes/change-email/+page.server.ts
// Handles the change-email-confirmation token redirect.
// better-auth requires an active session to process this token.
// If not logged in, redirect to login first then back here.
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const token       = url.searchParams.get('token');
	const callbackURL = url.searchParams.get('callbackURL') ?? '/profile';

	if (!token) redirect(302, '/profile');

	// Must be logged in to process email change
	if (!locals.user) {
		redirect(302, `/login?redirectTo=/change-email?token=${token}&callbackURL=${callbackURL}`);
	}

	// Process the token via better-auth's verify-email endpoint
	const verifyUrl = new URL('/api/auth/verify-email', url.origin);
	verifyUrl.searchParams.set('token', token);
	verifyUrl.searchParams.set('callbackURL', callbackURL);

	redirect(302, verifyUrl.toString());
};
