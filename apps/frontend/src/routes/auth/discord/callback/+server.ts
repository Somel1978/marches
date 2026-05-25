// apps/frontend/src/routes/auth/discord/callback/+server.ts
import { redirect } from '@sveltejs/kit';
import { platform, users } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code    = url.searchParams.get('code');
	const state   = url.searchParams.get('state'); // userId
	if (!code || !state) throw redirect(302, '/settings?error=discord_failed');

	const settings      = await platform.getSettingsMap();
	const clientId      = settings['discord.clientId'];
	const clientSecret  = settings['discord.clientSecret'];
	const siteUrl       = settings['site.url'] ?? 'http://localhost:5173';
	const callbackUrl   = settings['discord.callbackUrl'] || `${siteUrl}/auth/discord/callback`;

	// Exchange code for token
	const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id:     clientId!,
			client_secret: clientSecret!,
			grant_type:    'authorization_code',
			code,
			redirect_uri:  callbackUrl,
		}),
	});
	if (!tokenRes.ok) throw redirect(302, '/settings?error=discord_token_failed');
	const { access_token } = await tokenRes.json();

	// Get Discord user info
	const userRes = await fetch('https://discord.com/api/users/@me', {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	if (!userRes.ok) throw redirect(302, '/settings?error=discord_user_failed');
	const discordUser = await userRes.json();

	// Save to user record
	await users.updateDiscord(state, discordUser.id, discordUser.username);

	throw redirect(302, '/profile?success=discord_linked');
};