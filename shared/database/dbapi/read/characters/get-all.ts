// shared/database/dbapi/read/characters/get-all.ts
import { db } from '../../../index.ts';

export type GetAllCharactersOptions = {
    userId?:  string;
    status?:  string;
    worldId?: string;
    page?:    number;
    perPage?: number;
};

export async function getAllCharacters({
    userId, status, worldId, page = 1, perPage = 20,
}: GetAllCharactersOptions = {}) {
    const where = {
        ...(userId  && { userId }),
        ...(status  && { status: status as any }),
        ...(worldId && { worldId }),
    };

    const [items, total] = await db.$transaction([
        db.character.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
            include: { classes: true },
        }),
        db.character.count({ where }),
    ]);

    // Enrich with user names
    const userIds  = [...new Set(items.map(c => c.userId))];
    const users    = await db.user.findMany({
        where:  { id: { in: userIds } },
        select: { id: true, name: true, email: true },
    });
    const userMap  = Object.fromEntries(users.map(u => [u.id, u]));

    return {
        items: items.map(c => ({ ...c, user: userMap[c.userId] ?? null })),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
    };
}