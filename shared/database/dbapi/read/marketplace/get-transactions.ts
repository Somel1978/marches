// shared/database/dbapi/read/marketplace/get-transactions.ts
import { db } from '../../../index.ts';

export async function getMarketplaceTransactions({
    status, characterId, worldId, page = 1, perPage = 20,
}: { status?: string; characterId?: string; worldId?: string | null; page?: number; perPage?: number } = {}) {
    const where: any = {
        ...(status      && { status: status as any }),
        ...(characterId && { characterId }),
        // worldId filter: 'global' means null, otherwise match the id
        ...(worldId === 'global' ? { worldId: null } : worldId ? { worldId } : {}),
    };

    const [items, total] = await db.$transaction([
        db.marketplaceTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
            include: { item: true },
        }),
        db.marketplaceTransaction.count({ where }),
    ]);

    // Enrich with character, user, and world names
    const charIds   = [...new Set(items.map(t => t.characterId))];
    const userIds   = [...new Set(items.map(t => t.requestedBy))];
    const worldIds  = [...new Set(items.map(t => t.worldId).filter(Boolean))] as string[];

    const [chars, users, worlds] = await Promise.all([
        db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true, userId: true } }),
        db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
        worldIds.length > 0
            ? db.world.findMany({ where: { id: { in: worldIds } }, select: { id: true, name: true } })
            : Promise.resolve([]),
    ]);

    const charMap  = Object.fromEntries(chars.map(c => [c.id, c]));
    const userMap  = Object.fromEntries(users.map(u => [u.id, u.name]));
    const worldMap = Object.fromEntries((worlds as any[]).map(w => [w.id, w.name]));

    return {
        items: items.map(t => ({
            ...t,
            character:  charMap[t.characterId] ?? { id: t.characterId, name: 'Deleted Character' },
            playerName: userMap[t.requestedBy] ?? t.requestedBy,
            worldName:  t.worldId ? (worldMap[t.worldId] ?? t.worldId) : null,
        })),
        total, page, perPage, totalPages: Math.ceil(total / perPage),
    };
}