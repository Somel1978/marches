// apps/frontend/src/routes/auth/discord/+server.ts
import { redirect } from '@sveltejs/kit';
import { platform } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const settings     = await platform.getSettingsMap();
	const clientId     = settings['discord.clientId'];
	const siteUrl      = settings['site.url'] ?? 'http://localhost:5173';
	const callbackUrl  = settings['discord.callbackUrl'] || `${siteUrl}/auth/discord/callback`;
	if (!clientId) throw redirect(302, '/settings?error=discord_not_configured');

	const params = new URLSearchParams({
		client_id:     clientId,
		redirect_uri:  callbackUrl,
		response_type: 'code',
		scope:         'identify',
		state:         locals.user.id,
	});
	throw redirect(302, `https://discord.com/api/oauth2/authorize?${params}`);
};