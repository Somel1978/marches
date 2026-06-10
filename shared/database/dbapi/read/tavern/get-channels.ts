// shared/database/dbapi/read/tavern/get-channels.ts
import { db } from '../../../index.ts';

export async function getTavernChannels() {
    return db.tavernChannel.findMany({
        where:   { isActive: true },
        include: { world: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ worldId: 'asc' }], // global (null worldId) first
    });
}

export async function getTavernChannel(id: string) {
    return db.tavernChannel.findUnique({
        where:   { id },
        include: { world: { select: { id: true, name: true, slug: true } } },
    });
}

export async function getTavernChannelByWorldId(worldId: string) {
    return db.tavernChannel.findUnique({ where: { worldId } });
}

export async function getGlobalTavernChannel() {
    return db.tavernChannel.findFirst({ where: { worldId: null, isActive: true } });
}

export async function getTavernMessages(channelId: string, limit = 100) {
    return db.tavernMessage.findMany({
        where:   { channelId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    }).then(msgs => msgs.reverse()); // return oldest-first for display
}
