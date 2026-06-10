// shared/database/dbapi/read/characters/get-public.ts
import { db } from '../../../index.ts';

export async function getPublicCharacters(query?: string) {
    const where: any = {};
    if (query) {
        where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
        ];
    }

    const chars = await db.character.findMany({
        where,
        select: {
            id:           true,
            name:         true,
            avatarUrl:    true,
            portraitUrl:  true,
            isPrivate:    true,
            status:       true,
            gameSystemId: true,
            userId:       true,
        },
        orderBy: { name: 'asc' },
    });

    // Resolve userIds to names — no relation on Character
    const userIds = [...new Set(chars.map(c => c.userId))];
    const users   = await db.user.findMany({
        where:  { id: { in: userIds } },
        select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Search by player name if query provided
    const filtered = query
        ? chars.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (userMap[c.userId]?.name ?? '').toLowerCase().includes(query.toLowerCase())
        )
        : chars;

    return filtered.map(c => ({ ...c, user: userMap[c.userId] ?? null }));
}

export async function getPublicCharacterById(id: string) {
    const char = await db.character.findUnique({
        where:  { id },
        select: {
            id:           true,
            name:         true,
            avatarUrl:    true,
            portraitUrl:  true,
            isPrivate:    true,
            status:       true,
            gameSystemId: true,
            userId:       true,
        },
    });
    if (!char) return null;

    const user = await db.user.findUnique({
        where:  { id: char.userId },
        select: { id: true, name: true },
    });

    return { ...char, user };
}