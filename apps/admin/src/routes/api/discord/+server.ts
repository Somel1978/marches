// apps/admin/src/routes/api/discord/+server.ts
import { json } from '@sveltejs/kit';
import { platform } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json([], { status: 401 });

	const settings = await platform.getSettingsMap();
	const token    = settings['discord.botToken'];
	if (!token) return json({ error: 'Bot token not set in platform settings.' }, { status: 400 });

	try {
		const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
			headers: { Authorization: `Bot ${token}` },
		});
		if (!res.ok) return json({ error: 'Failed to fetch guilds from Discord API.' }, { status: 502 });
		const guilds = await res.json();
		return json(guilds.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon })));
	} catch {
		return json({ error: 'Could not reach Discord API.' }, { status: 502 });
	}
};
