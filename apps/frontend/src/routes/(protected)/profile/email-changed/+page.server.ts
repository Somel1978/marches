// apps/frontend/src/routes/(protected)/profile/email-changed/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Dedicated landing route after email change verification.
// better-auth redirects here after processing the change-email token.
// We redirect to profile with a flash param that survives the navigation.
export const load: PageServerLoad = async () => {
	redirect(302, '/profile?emailChanged=1');
};
