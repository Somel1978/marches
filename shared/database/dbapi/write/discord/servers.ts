// shared/database/dbapi/write/discord/servers.ts
import { db } from '../../../index.ts';

export async function upsertDiscordServer(input: {
    guildId: string; name: string; scope: string;
}) {
    return db.discordServer.upsert({
        where:  { guildId: input.guildId },
        update: { name: input.name, scope: input.scope },
        create: { guildId: input.guildId, name: input.name, scope: input.scope },
    });
}

export async function deleteDiscordServer(id: string) {
    return db.discordServer.delete({ where: { id } });
}

export async function upsertDiscordChannel(input: {
    serverId: string; channelId: string; channelName: string; type: string;
}) {
    return db.discordChannel.upsert({
        where:  { serverId_type: { serverId: input.serverId, type: input.type as any } },
        update: { channelId: input.channelId, channelName: input.channelName },
        create: {
            serverId:    input.serverId,
            channelId:   input.channelId,
            channelName: input.channelName,
            type:        input.type as any,
        },
    });
}

export async function deleteDiscordChannel(id: string) {
    return db.discordChannel.delete({ where: { id } });
}
