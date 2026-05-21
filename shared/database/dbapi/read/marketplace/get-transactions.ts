// shared/database/dbapi/read/marketplace/get-transactions.ts
import { db } from '../../../index.ts';

export async function getMarketplaceTransactions({
    status, characterId, page = 1, perPage = 20,
}: { status?: string; characterId?: string; page?: number; perPage?: number } = {}) {
    const where: any = {
        ...(status      && { status: status as any }),
        ...(characterId && { characterId }),
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

    // Enrich with character and user names
    const charIds = [...new Set(items.map(t => t.characterId))];
    const userIds = [...new Set(items.map(t => t.requestedBy))];
    const [chars, users] = await Promise.all([
        db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true, userId: true } }),
        db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    ]);
    const charMap = Object.fromEntries(chars.map(c => [c.id, c]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    return {
        items: items.map(t => ({
            ...t,
            character:  charMap[t.characterId] ?? null,
            playerName: userMap[t.requestedBy] ?? t.requestedBy,
        })),
        total, page, perPage, totalPages: Math.ceil(total / perPage),
    };
}
