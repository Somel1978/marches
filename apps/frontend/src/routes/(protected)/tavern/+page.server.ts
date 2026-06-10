// apps/frontend/src/routes/(protected)/tavern/+page.server.ts
import { fail } from '@sveltejs/kit';
import { tavern, characters, db, queueDiscordNotification, news } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Ensure global channel exists
	await tavern.channels.ensureGlobal();

	// Ensure all active worlds have a tavern channel (backfill for existing worlds)
	const allWorlds = await db.world.findMany({ where: { isActive: true }, select: { id: true, name: true } });
	await Promise.all(allWorlds.map((w: any) => tavern.channels.ensureWorld(w.id, w.name)));

	const [channels, myChars, dmProfile] = await Promise.all([
		tavern.channels.getAll(),
		characters.getByUserId(locals.user!.id),
		db.dMProfile.findFirst({ where: { userId: locals.user!.id }, select: { id: true } }),
	]);

	const isAdmin = checkPermission(locals.permissions, { resourceKey: 'User', action: 'read' }).allowed;
	const isDM    = !!dmProfile;

	// World IDs the user has an active character in
	const memberWorldIds = new Set(
		(myChars as any[]).filter((c: any) => ['ACTIVE','RESTING','PENDING'].includes(c.status) && c.worldId)
			.map((c: any) => c.worldId as string)
	);

	// Filter out private channels the user doesn't have access to (admins see all)
	const visibleChannels = (channels as any[]).filter((ch: any) => {
		if (!ch.worldId) return true;            // global always visible
		if (isAdmin || isDM) return true;         // admins and DMs see all world channels
		if (!ch.isPrivate) return true;           // public world channels visible to all
		return memberWorldIds.has(ch.worldId);    // private: only world members
	});

	// Active channel from query param, default to global
	const globalChannel = channels.find((ch: any) => !ch.worldId);
	const activeId      = url.searchParams.get('channel') ?? globalChannel?.id ?? '';
	const activeChannel = channels.find((ch: any) => ch.id === activeId) ?? globalChannel;

	// Ensure world channel exists if needed
	if (activeChannel?.worldId) {
		await tavern.channels.ensureWorld(activeChannel.worldId, activeChannel.name);
	}

	const rawMessages = activeId ? await tavern.messages.get(activeId) : [];

	// Batch-resolve enrichers for all message content
	const messages = await Promise.all(
		(rawMessages as any[]).map(async (msg: any) => {
			if (!msg.content?.includes('[[')) return msg;
			const { tokens } = await news.enrichers.resolve(msg.content);
			return { ...msg, tokens };
		})
	);

	// Active characters for author picker
	const activeChars = (myChars as any[]).filter((c: any) =>
		['ACTIVE', 'RESTING'].includes(c.status)
	);

	return { channels: visibleChannels, messages, activeChannel, activeChars, isAdmin, isDM, user: locals.user };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const data        = await request.formData();
		const channelId   = data.get('channelId')?.toString()   ?? '';
		const content     = data.get('content')?.toString()     ?? '';
		const authorType  = data.get('authorType')?.toString()  ?? 'CHARACTER';
		const characterId = data.get('characterId')?.toString() || undefined;
		const characterName = data.get('characterName')?.toString() || undefined;

		if (!channelId || !content.trim()) return fail(400, { message: 'Invalid message.' });

		let authorName   = locals.user!.name;
		let authorAvatar = locals.user!.image ?? undefined;

		if (authorType === 'CHARACTER' && characterId) {
			// Use character avatar if available
			const char = await db.character.findUnique({
				where:  { id: characterId },
				select: { avatarUrl: true, portraitUrl: true, name: true, userId: true },
			});
			if (char?.userId !== locals.user!.id) return fail(403, { message: 'Not your character.' });
			authorAvatar = char?.avatarUrl ?? char?.portraitUrl ?? authorAvatar;
		}

		try {
			const msg = await tavern.messages.send({
				channelId,
				authorId:     locals.user!.id,
				authorType:   authorType as any,
				authorName,
				authorAvatar,
				characterId,
				characterName,
				content,
			});
			// Mirror to Discord
			const ch = await tavern.channels.getById(channelId);
			await queueDiscordNotification('TAVERN_MESSAGE', {
				channelId,
				worldId:       ch?.worldId ?? undefined,
				authorName,
				authorType,
				characterName: characterName || undefined,
				content,
			}).catch(() => {}); // non-blocking
			return { success: true };
		} catch (e: any) {
			return fail(400, { message: e.message ?? 'Failed to send message.' });
		}
	},

	delete: async ({ request, locals }) => {
		const id      = (await request.formData()).get('id')?.toString() ?? '';
		const isAdmin = checkPermission(locals.permissions, { resourceKey: 'User', action: 'read' }).allowed;

		// Verify ownership — only the author or an admin can delete
		const msg = await db.tavernMessage.findUnique({ where: { id }, select: { authorId: true } });
		if (!msg) return fail(404, { message: 'Message not found.' });
		if (!isAdmin && msg.authorId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });

		await tavern.messages.delete(id, locals.user!.id);
		return { success: true };
	},
};