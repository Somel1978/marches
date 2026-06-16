// apps/admin/src/routes/(app)/discord/+page.server.ts
import { fail } from '@sveltejs/kit';
import { discord, worlds, platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const [servers, allWorlds, settings] = await Promise.all([
		discord.servers.getAll(),
		worlds.getAll(),
		platform.getSettingsMap(),
	]);
	return { servers, allWorlds, settings };
};

export const actions: Actions = {
	saveServer: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const guildId = data.get('guildId')?.toString().trim() ?? '';
		const name    = data.get('name')?.toString().trim()    ?? '';
		const scope   = data.get('scope')?.toString()          ?? 'global';
		if (!guildId || !name) return fail(400, { message: 'Guild ID and name required.' });
		await discord.servers.upsert({ guildId, name, scope });
		return { success: true, action: 'server' };
	},

	saveChannel: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const serverId    = data.get('serverId')?.toString()    ?? '';
		const channelId   = data.get('channelId')?.toString().trim() ?? '';
		const channelName = data.get('channelName')?.toString().trim() ?? channelId;
		const type        = data.get('type')?.toString()        ?? '';
		if (!serverId || !channelId || !type) return fail(400, { message: 'Missing fields.' });
		await discord.channels.upsert({ serverId, channelId, channelName, type });
		return { success: true, action: 'channel' };
	},

	deleteServer: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'System', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		await discord.servers.delete(id);
		return { success: true };
	},

	syncCommands: async ({ locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { execSync } = await import('child_process');
		try {
			execSync('pnpm --filter @apps/discord register', {
				cwd:   process.cwd(),
				stdio: 'pipe',
			});
			return { success: true, action: 'sync' };
		} catch (e: any) {
			return fail(500, { message: e?.stderr?.toString() || 'Command sync failed.' });
		}
	},
};