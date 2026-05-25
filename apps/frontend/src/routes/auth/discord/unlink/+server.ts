// apps/frontend/src/routes/auth/discord/unlink/+server.ts
import { redirect } from '@sveltejs/kit';
import { users } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	await users.updateDiscord(locals.user.id, null, null);
	throw redirect(302, '/profile?success=discord_unlinked');
};