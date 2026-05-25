// apps/admin/src/routes/api/discord/channels/+server.ts
import { json } from '@sveltejs/kit';
import { platform } from '@core/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json([], { status: 401 });

	const guildId = url.searchParams.get('guildId');
	if (!guildId) return json({ error: 'guildId required' }, { status: 400 });

	const settings = await platform.getSettingsMap();
	const token    = settings['discord.botToken'];
	if (!token) return json({ error: 'Bot token not set.' }, { status: 400 });

	try {
		const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
			headers: { Authorization: `Bot ${token}` },
		});
		if (!res.ok) return json({ error: 'Failed to fetch channels.' }, { status: 502 });
		const channels = await res.json();
		// Only return text channels (type 0)
		return json(channels
			.filter((c: any) => c.type === 0)
			.map((c: any) => ({ id: c.id, name: c.name }))
			.sort((a: any, b: any) => a.name.localeCompare(b.name))
		);
	} catch {
		return json({ error: 'Could not reach Discord API.' }, { status: 502 });
	}
};
