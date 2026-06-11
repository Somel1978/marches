// shared/database/dbapi/read/characters/get-transactions.ts
import { db } from '../../../index.ts';

export async function getCharacterTransactions(characterId: string, limit = 50) {
    const txs = await db.characterTransaction.findMany({
        where:   { characterId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    });

    // Batch enrich QUEST transactions with world name in 2 parallel queries
    const questIds = [...new Set(
        txs.filter(t => t.sourceType === 'QUEST' && t.sourceId).map(t => t.sourceId!)
    )];

    if (!questIds.length) return txs.map(t => ({ ...t, worldName: null }));

    const quests = await db.quest.findMany({
        where:  { id: { in: questIds } },
        select: { id: true, regionId: true },
    });
    const regionIds = [...new Set(quests.map((q: any) => q.regionId).filter(Boolean))] as string[];
    const regions   = regionIds.length
        ? await db.region.findMany({
            where:  { id: { in: regionIds } },
            select: { id: true, world: { select: { name: true } } },
        })
        : [];
    const regionWorldMap = Object.fromEntries(
        regions.map((r: any) => [r.id, r.world?.name ?? null])
    );
    const questWorldMap = Object.fromEntries(
        quests.map((q: any) => [q.id, q.regionId ? (regionWorldMap[q.regionId] ?? null) : null])
    );

    return txs.map(t => ({
        ...t,
        worldName: t.sourceType === 'QUEST' && t.sourceId ? (questWorldMap[t.sourceId] ?? null) : null,
    }));
}