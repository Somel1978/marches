// shared/database/dbapi/read/discord/get-servers.ts
import { db } from '../../../index.ts';

export async function getAllDiscordServers() {
    return db.discordServer.findMany({
        include: { channels: true },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getDiscordServerByScope(scope: string) {
    return db.discordServer.findFirst({
        where:   { scope },
        include: { channels: true },
    });
}

export async function getChannelForType(scope: string, type: string) {
    const server = await db.discordServer.findFirst({
        where:   { scope },
        include: { channels: { where: { type: type as any } } },
    });
    return server?.channels[0] ?? null;
}

export async function getPendingNotifications(take = 20) {
    return db.discordNotificationQueue.findMany({
        where:   { processed: false },
        orderBy: { createdAt: 'asc' },
        take,
    });
}

export async function markNotificationProcessed(id: string) {
    return db.discordNotificationQueue.update({ where: { id }, data: { processed: true } });
}
export async function getChannelsForType(scope: string, type: string) {
    // Returns ALL channels of this type for this scope — there may be multiple servers
    const servers = await db.discordServer.findMany({
        where:   { scope },
        include: { channels: { where: { type: type as any } } },
    });
    return servers.flatMap(s => s.channels);
}