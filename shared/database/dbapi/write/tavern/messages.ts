// shared/database/dbapi/write/tavern/messages.ts
import { db } from '../../../index.ts';
import { ValidationError } from '@core/errors';

const MESSAGE_CAP = 200;

export async function sendTavernMessage(input: {
    channelId:     string;
    authorId:      string;
    authorType:    'CHARACTER' | 'DM' | 'ADMIN';
    authorName:    string;
    authorAvatar?: string;
    characterId?:  string;
    characterName?: string;
    content:       string;
}) {
    if (!input.content.trim()) throw new ValidationError('Message cannot be empty.');
    if (input.content.length > 2000) throw new ValidationError('Message too long (max 2000 characters).');

    const message = await db.tavernMessage.create({
        data: {
            channelId:     input.channelId,
            authorId:      input.authorId,
            authorType:    input.authorType as any,
            authorName:    input.authorName,
            authorAvatar:  input.authorAvatar  ?? null,
            characterId:   input.characterId   ?? null,
            characterName: input.characterName ?? null,
            content:       input.content.trim(),
        },
    });

    // Enforce 200-message soft cap — delete oldest beyond cap
    const count = await db.tavernMessage.count({ where: { channelId: input.channelId } });
    if (count > MESSAGE_CAP) {
        const oldest = await db.tavernMessage.findMany({
            where:   { channelId: input.channelId },
            orderBy: { createdAt: 'asc' },
            take:    count - MESSAGE_CAP,
            select:  { id: true },
        });
        await db.tavernMessage.deleteMany({ where: { id: { in: oldest.map(m => m.id) } } });
    }

    return message;
}

export async function deleteTavernMessage(id: string, deletedBy: string) {
    return db.tavernMessage.update({
        where: { id },
        data:  { isDeleted: true, deletedBy, deletedAt: new Date() },
    });
}

// Ensure global channel exists — called on app startup or first access
export async function ensureGlobalTavernChannel() {
    const existing = await db.tavernChannel.findFirst({ where: { worldId: null } });
    if (!existing) {
        await db.tavernChannel.create({ data: { worldId: null, name: 'Global' } });
    }
    return existing;
}

// Ensure world channel exists — fallback if auto-create missed
export async function ensureWorldTavernChannel(worldId: string, worldName: string) {
    const existing = await db.tavernChannel.findUnique({ where: { worldId } });
    if (!existing) {
        await db.tavernChannel.create({ data: { worldId, name: worldName } });
    }
    return existing;
}

export async function updateTavernChannel(id: string, data: { isPrivate?: boolean; isActive?: boolean; name?: string }) {
    return db.tavernChannel.update({ where: { id }, data });
}
