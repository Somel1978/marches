// shared/database/dbapi/write/token-store/apply-boosts.ts
import { db } from '../../../index.ts';

// Get quest IDs for a character, optionally filtered by world
async function getQuestIdsForCharacter(characterId: string, worldId?: string | null): Promise<string[]> {
    if (worldId) {
        const regions = await db.region.findMany({ where: { worldId }, select: { id: true } });
        const regionIds = regions.map((r: any) => r.id);
        const quests = await db.quest.findMany({ where: { regionId: { in: regionIds } }, select: { id: true } });
        const questIds = quests.map((q: any) => q.id);
        // Only return quests this character actually participated in
        const txs = await db.characterTransaction.findMany({
            where: { characterId, sourceType: 'QUEST', sourceId: { in: questIds },
                     delta: { gt: 0 }, NOT: { note: { contains: 'boost:' } } },
            select: { sourceId: true },
        });
        return [...new Set(txs.map(t => t.sourceId).filter((id): id is string => !!id))];
    }
    // Global: all quests this character has base transactions for
    const txs = await db.characterTransaction.findMany({
        where: { characterId, sourceType: 'QUEST', delta: { gt: 0 },
                 NOT: { note: { contains: 'boost:' } } },
        select: { sourceId: true },
    });
    return [...new Set(txs.map(t => t.sourceId).filter((id): id is string => !!id))];
}

// Apply boost for all quests — per quest per boost, delete+recreate each time
export async function applyBoostPerQuest(
    tx: any,
    characterId: string,
    stTxId:      string,
    item:        any,
    direction:   'RETROSPECTIVE' | 'FUTURE' | 'BOTH',
): Promise<number> {
    if (direction === 'FUTURE') return 0;

    const rv  = (typeof item.rewardValue === 'string' ? JSON.parse(item.rewardValue) : item.rewardValue) as any;
    const pct = Number(rv?.percent ?? 0);
    if (!pct) return 0;

    const type: 'XP' | 'GOLD' = item.rewardType === 'XP_BOOST' ? 'XP' : 'GOLD';
    const worldId = item.scope === 'WORLD' ? item.worldId : null;
    const field   = type === 'XP' ? 'totalXp' : 'totalGold';

    const questIds = await getQuestIdsForCharacter(characterId, worldId);
    if (!questIds.length) return 0;

    let count = 0;
    for (const questId of questIds) {
        // Sum base XP/Gold for this quest (exclude boost transactions)
        const baseTxs = await db.characterTransaction.findMany({
            where: { characterId, type, sourceType: 'QUEST', sourceId: questId,
                     NOT: { note: { contains: 'boost:' } }, delta: { gt: 0 } },
            select: { delta: true },
        });
        const baseTotal = baseTxs.reduce((s: number, t: any) => s + (t.delta ?? 0), 0);
        const newBonus  = Math.floor(baseTotal * (pct / 100));

        // Find and delete existing boost transaction for this quest+boost
        const existing = await db.characterTransaction.findFirst({
            where: { characterId, type, sourceType: 'QUEST', sourceId: questId,
                     note: { contains: `boost:${stTxId}` } },
            select: { id: true, delta: true },
        });

        if (existing) {
            // Deduct old bonus from character total then delete
            const oldDelta = existing.delta ?? 0;
            if (oldDelta !== 0) {
                await tx.character.update({ where: { id: characterId },
                    data: { [field]: { decrement: oldDelta } } });
            }
            await tx.characterTransaction.delete({ where: { id: existing.id } });
        }

        if (newBonus <= 0) continue;

        // Create fresh transaction
        await tx.character.update({ where: { id: characterId },
            data: { [field]: { increment: newBonus } } });
        await tx.characterTransaction.create({
            data: {
                characterId, type, delta: newBonus,
                sourceType: 'QUEST', sourceId: questId,
                note:       `Quest ${type} boost: ${item.name} (+${pct}% — boost:${stTxId})`,
                createdBy:  stTxId,
            },
        });
        count++;
    }
    return count;
}

// Apply future boost for a single quest at approval time
export async function applyFutureBoostForQuest(
    tx: any,
    characterId:  string,
    questId:      string,
    xpGranted:    number,
    goldGranted:  number,
    questWorldId: string | null,
): Promise<void> {
    const boosts = await db.tokenStoreTransaction.findMany({
        where: { characterId, status: 'APPROVED' },
        include: { item: true },
    });

    for (const boost of boosts) {
        const item = boost.item;
        if (item.rewardType !== 'XP_BOOST' && item.rewardType !== 'GOLD_BOOST') continue;
        const rv  = (typeof item.rewardValue === 'string' ? JSON.parse(item.rewardValue) : item.rewardValue) as any;
        const dir = rv?.direction ?? 'BOTH';
        if (dir === 'RETROSPECTIVE') continue;
        if (item.scope === 'WORLD' && item.worldId !== questWorldId) continue;

        const pct  = Number(rv?.percent ?? 0);
        if (!pct) continue;

        const type: 'XP' | 'GOLD' = item.rewardType === 'XP_BOOST' ? 'XP' : 'GOLD';
        const base  = type === 'XP' ? xpGranted : goldGranted;
        const bonus = Math.floor(base * (pct / 100));
        if (bonus <= 0) continue;

        // Delete existing boost for this quest+boost if any, then recreate
        const existing = await db.characterTransaction.findFirst({
            where: { characterId, type, sourceType: 'QUEST', sourceId: questId,
                     note: { contains: `boost:${boost.id}` } },
            select: { id: true, delta: true },
        });
        if (existing) {
            const oldDelta = existing.delta ?? 0;
            if (oldDelta !== 0) {
                await tx.character.update({ where: { id: characterId },
                    data: { [type === 'XP' ? 'totalXp' : 'totalGold']: { decrement: oldDelta } } });
            }
            await tx.characterTransaction.delete({ where: { id: existing.id } });
        }

        await tx.character.update({ where: { id: characterId },
            data: { [type === 'XP' ? 'totalXp' : 'totalGold']: { increment: bonus } } });
        await tx.characterTransaction.create({
            data: {
                characterId, type, delta: bonus,
                sourceType: 'QUEST', sourceId: questId,
                note:       `Quest ${type} boost: ${item.name} (+${pct}% on quest — boost:${boost.id})`,
                createdBy:  boost.id,
            },
        });
    }
}