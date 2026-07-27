// shared/database/dbapi/write/quests/delete.ts
import { db } from '../../../index.ts';
import { applyProgressionChange } from '../characters/progression.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function deleteQuest(id: string, actorId: string, revertRewards = false) {
    const quest = await db.quest.findUnique({
        where:   { id },
        include: { result: { include: { characters: true } } },
    });
    if (!quest) throw new NotFoundError('Quest', id);

    return db.$transaction(async (tx) => {
        // Always revert pending item usages (regardless of result status)
        const pendingUsages = await tx.questItemUsage.findMany({
            where: { questId: id, status: 'PENDING' },
        });
        for (const usage of pendingUsages) {
            await tx.questItemUsage.update({ where: { id: usage.id }, data: { status: 'REJECTED' as any, reviewedBy: actorId, reviewNote: 'Quest deleted' } });
        }

        if (revertRewards && quest.result?.status === 'APPROVED') {
            // Revert inventory items granted by this quest
            const inventoryItems = await tx.characterInventory.findMany({
                where: { sourceType: 'QUEST', sourceId: id },
            });
            for (const inv of inventoryItems) {
                if (inv.quantity > 1) {
                    await tx.characterInventory.update({
                        where: { id: inv.id },
                        data:  { quantity: { decrement: 1 } },
                    });
                } else {
                    await tx.characterInventory.delete({ where: { id: inv.id } });
                }
                // Audit trail for item removal
                await tx.characterTransaction.create({ data: {
                    characterId: inv.characterId,
                    type:        'REWARD',
                    delta:       -1,
                    sourceType:  'ADMIN',
                    note:        `Item reverted: ${inv.itemName} (quest deleted: ${quest.title})`,
                    createdBy:   actorId,
                }});
            }

            // Find all CharacterTransactions sourced from this quest
            const txns = await tx.characterTransaction.findMany({
                where: { sourceId: id, sourceType: 'QUEST', type: { in: ['XP', 'GOLD', 'TOKEN', 'MILESTONE', 'REWARD'] as any[] } },
            });

            // Group by characterId and sum deltas per type
            const revertMap: Record<string, { xp: number; gold: number; tokens: number; milestones: number }> = {};
            for (const t of txns) {
                if (!revertMap[t.characterId]) revertMap[t.characterId] = { xp: 0, gold: 0, tokens: 0, milestones: 0 };
                if (t.type === 'XP' || t.type === 'REWARD') revertMap[t.characterId].xp     += (t.delta ?? 0);
                if (t.type === 'GOLD')                          revertMap[t.characterId].gold   += (t.delta ?? 0);
                if (t.type === 'TOKEN')                         revertMap[t.characterId].tokens += (t.delta ?? 0);
                if (t.type === 'MILESTONE')                     revertMap[t.characterId].milestones += (t.delta ?? 0);
            }

            // Reverse the grants on each character (skip zero amounts)
            for (const [characterId, deltas] of Object.entries(revertMap)) {
                const data: any = {};
                if (deltas.gold   > 0) data.totalGold   = { decrement: deltas.gold };
                if (deltas.tokens > 0) data.totalTokens = { decrement: deltas.tokens };
                if (Object.keys(data).length) {
                    await tx.character.update({ where: { id: characterId }, data });
                }

                // XP and milestone reversal go through the progression path so a
                // resulting level-down is detected the same way everywhere else.
                if (deltas.xp > 0 || deltas.milestones > 0) {
                    await applyProgressionChange(tx, {
                        characterId,
                        actorId,
                        xpDelta:        -deltas.xp,
                        milestoneDelta: -deltas.milestones,
                        source: {
                            type: 'ADMIN',
                            note: `Quest deleted — XP reverted (quest: ${quest.title})`,
                        },
                        milestoneNote: `Quest deleted — milestone reverted (quest: ${quest.title})`,
                    });
                }

                if (deltas.gold > 0) await tx.characterTransaction.create({
                    data: { characterId, type: 'GOLD', delta: -deltas.gold, sourceType: 'ADMIN',
                            note: `Quest deleted — gold reverted (quest: ${quest.title})`, createdBy: actorId },
                });
                if (deltas.tokens > 0) await tx.characterTransaction.create({
                    data: { characterId, type: 'TOKEN', delta: -deltas.tokens, sourceType: 'ADMIN',
                            note: `Quest deleted — tokens reverted (quest: ${quest.title})`, createdBy: actorId },
                });
            }
        }

        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'Quest',
            resourceId:  id,
            before:      { ...quest, revertRewards },
        });
        await tx.quest.delete({ where: { id } });
    });
}