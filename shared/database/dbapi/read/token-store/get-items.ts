// shared/database/dbapi/read/token-store/get-items.ts
import { db } from '../../../index.ts';

export async function getTokenStoreItems({ search, gameSystemId, scope, worldId, activeOnly = true }: {
    search?:       string;
    gameSystemId?: string;
    scope?:        string;
    worldId?:      string;
    activeOnly?:   boolean;
} = {}) {
    const where: any = {};
    if (activeOnly)  where.isActive = true;
    if (search)      where.name = { contains: search, mode: 'insensitive' };
    if (gameSystemId) where.OR = [{ gameSystemId }, { gameSystemId: null }];
    if (scope)       where.scope = scope;
    if (worldId)     where.OR = [{ scope: 'GLOBAL' }, { scope: 'WORLD', worldId }];

    return db.tokenStoreItem.findMany({ where, orderBy: { name: 'asc' } });
}

export async function getTokenStoreItemById(id: string) {
    return db.tokenStoreItem.findUnique({ where: { id } });
}

export async function getAllTokenStoreItemsForExport() {
    return db.tokenStoreItem.findMany({ orderBy: { name: 'asc' } });
}

export async function getTokenStoreTransactions({ characterId, worldId, status }: {
    characterId?: string;
    worldId?:     string;
    status?:      string;
} = {}) {
    const where: any = {};
    if (characterId) where.characterId = characterId;
    if (worldId)     where.worldId     = worldId;
    if (status)      where.status      = status;

    const txs = await db.tokenStoreTransaction.findMany({
        where,
        include: { item: true },
        orderBy: { createdAt: 'desc' },
    });

    // Enrich with character names
    const charIds = [...new Set(txs.map(t => t.characterId))];
    const chars   = charIds.length
        ? await db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true } })
        : [];
    const charMap = Object.fromEntries(chars.map(c => [c.id, c.name]));

    return txs.map(t => ({ ...t, characterName: charMap[t.characterId] ?? t.characterId }));
}

export async function getTokenStoreTransactionById(id: string) {
    return db.tokenStoreTransaction.findUnique({
        where:   { id },
        include: { item: true },
    });
}

export async function getActiveBoostsForCharacter(characterId: string, type: 'XP_BOOST' | 'GOLD_BOOST') {
    return db.tokenStoreTransaction.findMany({
        where: {
            characterId,
            status:    'APPROVED',
            item:      { is: { rewardType: type } },
        },
        include: { item: true },
    });
}