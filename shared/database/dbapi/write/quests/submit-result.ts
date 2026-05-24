// shared/database/dbapi/write/quests/submit-result.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotificationsForAdmins, createNotification } from '../notifications/notifications.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function submitQuestResult(
    questId: string,
    submittedBy: string,
    actorId: string,
) {
    const quest = await db.quest.findUnique({
        where:   { id: questId },
        include: {
            signups: { where: { status: 'CONFIRMED' as any } },
            result:  true,
        },
    });
    if (!quest)                           throw new NotFoundError('Quest', questId);
    if (quest.status !== 'PENDING_RESULT') throw new ValidationError('Quest must be in PENDING_RESULT status.');
    if (quest.result && quest.result.status !== 'REJECTED') throw new ValidationError('Result already submitted.');

    const confirmed = quest.signups;
    if (confirmed.length === 0) throw new ValidationError('No confirmed players to distribute XP to.');

    const count        = confirmed.length;
    const missionXpPerPlayer = Math.max(1, Math.floor(quest.missionXp / count));

    // Calculate divisible rewards per player (including extra XP)
    const rewards = await db.questReward.findMany({ where: { questId } });
    const xpReward     = rewards.find(r => r.type === 'XP');
    const goldReward   = rewards.find(r => r.type === 'GOLD');
    const tokenReward  = rewards.find(r => r.type === 'TOKEN');
    const extraXpPerPlayer  = xpReward    ? Math.max(0, Math.floor(xpReward.amount    / count)) : 0;
    const goldPerPlayer     = goldReward  ? Math.max(0, Math.floor(goldReward.amount  / count)) : 0;
    const tokensPerPlayer   = tokenReward ? Math.max(0, Math.floor(tokenReward.amount / count)) : 0;
    const xpPerPlayer = missionXpPerPlayer + extraXpPerPlayer;

    await createNotificationsForAdmins(
        'QUEST_RESULT_PENDING', 'Quest result awaiting approval',
        `Results submitted for "${quest.title}".`,
        `/quests/${questId}`,
    );

    return db.$transaction(async (tx) => {
        let result;
        if (quest.result?.status === 'REJECTED') {
            // Resubmission — update existing rejected result and replace characters
            await tx.questResultCharacter.deleteMany({ where: { resultId: quest.result.id } });
            result = await tx.questResult.update({
                where: { id: quest.result.id },
                data: {
                    missionXp:   quest.missionXp,
                    submittedBy,
                    status:      'PENDING_APPROVAL',
                    reviewNote:  null,
                },
            });
        } else {
            result = await tx.questResult.create({
                data: {
                    questId,
                    missionXp:   quest.missionXp,
                    submittedBy,
                    status:      'PENDING_APPROVAL',
                },
            });
        }

        await tx.questResultCharacter.createMany({
            data: confirmed.map(s => ({
                resultId:      result.id,
                characterId:   s.characterId,
                xpAwarded:     xpPerPlayer,
                goldAwarded:   goldPerPlayer,
                tokensAwarded: tokensPerPlayer,
            })),
        });

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'QuestResult',
            resourceId:  result.id,
            after:       { questId, missionXp: quest.missionXp, playerCount: confirmed.length, xpPerPlayer },
        });

        return result;
    });
}

export async function approveQuestResult(resultId: string, actorId: string) {
    const result = await db.questResult.findUnique({
        where:   { id: resultId },
        include: { characters: true, quest: { select: { title: true, dmProfileId: true } } },
    });
    if (!result) throw new NotFoundError('QuestResult', resultId);
    if (result.status !== 'PENDING_APPROVAL') throw new ValidationError('Result is not pending approval.');

    // Recalculate per-player rewards from CURRENT QuestReward records
    // (DM may have edited rewards after submit — always use latest values)
    const currentRewards = await db.questReward.findMany({ where: { questId: result.questId } });
    const playerCount    = result.characters.length;
    const currentGoldPerPlayer   = Math.max(0, Math.floor((currentRewards.find(r => r.type === 'GOLD')?.amount  ?? 0) / playerCount));
    const currentTokensPerPlayer = Math.max(0, Math.floor((currentRewards.find(r => r.type === 'TOKEN')?.amount ?? 0) / playerCount));
    const currentMissionXpPerPlayer = Math.max(1, Math.floor(result.missionXp / playerCount));
    const currentExtraXpReward      = currentRewards.find(r => r.type === 'XP');
    const currentExtraXpPerPlayer   = currentExtraXpReward ? Math.max(0, Math.floor(currentExtraXpReward.amount / playerCount)) : 0;
    const currentXpPerPlayer        = currentMissionXpPerPlayer + currentExtraXpPerPlayer;

    const settings = await getSettingsMap();
    const restDays  = Number(settings['character.restDays'] ?? 7);
    const restUntil = new Date(Date.now() + restDays * 24 * 60 * 60 * 1000);

    // Load characters + progression thresholds for level-up detection
    const charIds    = result.characters.map(rc => rc.characterId);
    const characters = await db.character.findMany({
        where:  { id: { in: charIds } },
        select: { id: true, userId: true, totalXp: true, gameSystemId: true },
    });
    const gameSystemIds = [...new Set(characters.map(c => c.gameSystemId))];
    const thresholds    = await db.progressionThreshold.findMany({
        where:   { gameSystemId: { in: gameSystemIds } },
        orderBy: { xpRequired: 'asc' },
    });
    const charMap = Object.fromEntries(characters.map(c => [c.id, c]));

    // Handle ITEM rewards — one randomized item per reward per character
    const itemRewards = currentRewards.filter(r => r.type === 'ITEM') as any[];
    // itemGrantMap: characterId -> array of items to grant (one per ITEM reward)
    const itemGrantMap: Record<string, { id: string; name: string }[]> = {};
    for (const itemReward of itemRewards) {
        const itemWhere: any = { isAvailable: true };
        if (itemReward.itemRarity)   itemWhere.rarity   = itemReward.itemRarity as any;
        if (itemReward.itemCategory) itemWhere.category = itemReward.itemCategory as any;
        if (itemReward.itemMaxValue) itemWhere.buyPrice = { lte: itemReward.itemMaxValue };

        const eligibleItems = await db.marketplaceItem.findMany({ where: itemWhere, select: { id: true, name: true } });
        if (eligibleItems.length === 0) {
            throw new ValidationError(
                `Cannot approve: no marketplace items match the item reward filters ` +
                `(rarity: ${itemReward.itemRarity ?? 'any'}, category: ${itemReward.itemCategory ?? 'any'}). ` +
                `Please add matching items or update the quest reward filters.`
            );
        }

        // Randomize one item per character for this reward
        for (const rc of result.characters) {
            const pick = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
            if (!itemGrantMap[rc.characterId]) itemGrantMap[rc.characterId] = [];
            itemGrantMap[rc.characterId].push({ id: pick.id, name: pick.name });
        }
    }

    await db.$transaction(async (tx) => {
        for (const rc of result.characters) {
            const char       = charMap[rc.characterId];
            const xpToGrant     = currentXpPerPlayer; // mission + extra
            const goldToGrant = currentGoldPerPlayer;
            const tokensToGrant = currentTokensPerPlayer;
            const newXp      = (char?.totalXp ?? 0) + xpToGrant;
            const charThresholds = thresholds.filter(t => t.gameSystemId === char?.gameSystemId);
            const prevThreshold  = charThresholds.filter(t => t.xpRequired <= (char?.totalXp ?? 0)).at(-1);
            const nextThreshold  = charThresholds.filter(t => t.xpRequired <= newXp).at(-1);
            const leveledUp      = nextThreshold && nextThreshold.id !== prevThreshold?.id;
            const newStatus      = leveledUp ? 'LEVEL_UP_PENDING' : 'RESTING';

            await tx.character.update({
                where: { id: rc.characterId },
                data: {
                    totalXp:     { increment: xpToGrant },
                    totalGold:   { increment: goldToGrant },
                    totalTokens: { increment: tokensToGrant },
                    restUntil,
                    status:      newStatus as any,
                },
            });

            // Mission XP transaction
            await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'XP', delta: currentMissionXpPerPlayer,
                sourceType: 'QUEST', sourceId: result.questId,
                note: `Mission XP: ${result.quest?.title ?? 'Quest'}`, createdBy: actorId,
            }});
            // Extra XP transaction (if any)
            if (currentExtraXpPerPlayer > 0) await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'XP', delta: currentExtraXpPerPlayer,
                sourceType: 'QUEST', sourceId: result.questId,
                note: `Bonus XP: ${result.quest?.title ?? 'Quest'}`, createdBy: actorId,
            }});

            // Gold transaction
            if (goldToGrant > 0) await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'GOLD', delta: goldToGrant,
                sourceType: 'QUEST', sourceId: result.questId,
                note: `Quest reward: ${result.quest?.title ?? 'Quest'}`, createdBy: actorId,
            }});

            // Update QuestResultCharacter with final awarded amounts
            await tx.questResultCharacter.update({
                where: { id: rc.id },
                data:  {
                    xpAwarded:     xpToGrant,
                    goldAwarded:   goldToGrant,
                    tokensAwarded: tokensToGrant,
                },
            });

            // Token transaction
            if (tokensToGrant > 0) await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'TOKEN', delta: tokensToGrant,
                sourceType: 'QUEST', sourceId: result.questId,
                note: `Quest reward: ${result.quest?.title ?? 'Quest'}`, createdBy: actorId,
            }});

            // Grant items if applicable (one per ITEM reward)
            const itemsToGrant = itemGrantMap[rc.characterId] ?? [];
            for (const item of itemsToGrant) {
                const existing = await tx.characterInventory.findFirst({
                    where: { characterId: rc.characterId, itemId: item.id },
                });
                if (existing) {
                    await tx.characterInventory.update({
                        where: { id: existing.id },
                        data:  { quantity: { increment: 1 } },
                    });
                } else {
                    await tx.characterInventory.create({
                        data: {
                            characterId:   rc.characterId,
                            itemId:        item.id,
                            itemName:      item.name,
                            quantity:      1,
                            purchasePrice: 0,
                            canSell:       false,
                            sourceType:    'QUEST',
                            sourceId:      result.questId,
                        },
                    });
                }
                await tx.characterTransaction.create({ data: {
                    characterId: rc.characterId, type: 'REWARD', delta: 1,
                    sourceType: 'QUEST', sourceId: result.questId,
                    note: `Quest item reward: ${item.name}`, createdBy: actorId,
                }});
                await tx.marketplaceTransaction.create({ data: {
                    itemId:             item.id,
                    characterId:        rc.characterId,
                    type:               'REWARD',
                    quantity:           1,
                    priceAtTransaction: 0,
                    totalPrice:         0,
                    status:             'APPROVED',
                    requestedBy:        actorId,
                    reviewedBy:         actorId,
                }});
            }
            // Record first item granted on QuestResultCharacter for display
            if (itemsToGrant.length > 0) {
                const names = itemsToGrant.map(i => i.name).join(', ');
                await tx.questResultCharacter.update({
                    where: { id: rc.id },
                    data:  { itemGrantedId: itemsToGrant[0].id, itemGrantedName: names } as any,
                });
            }

            // Status transaction
            await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'STATUS', delta: 0,
                sourceType: 'QUEST', sourceId: result.questId,
                note: leveledUp ? `Level up available! Resting until ${restUntil.toLocaleDateString()}` : `Resting until ${restUntil.toLocaleDateString()}`,
                createdBy: actorId,
            }});

            // Notify player
            if (char?.userId) {
                if (leveledUp) {
                    await createNotification(char.userId, 'LEVEL_UP', '🎉 Level up available!',
                        `You have enough XP to level up! Update your character sheet.`, `/characters/${rc.characterId}`);
                } else {
                    await createNotification(char.userId, 'QUEST_COMPLETE', 'Quest completed',
                        `"${result.quest?.title}" completed. Your character is resting until ${restUntil.toLocaleDateString()}.`, `/characters/${rc.characterId}`);
                }
            }
        }

        // Process all PENDING item usages for this quest
        const pendingUsages = await tx.questItemUsage.findMany({
            where: { questId: result.questId, status: 'PENDING' },
        });
        for (const usage of pendingUsages) {
            const inv = await tx.characterInventory.findUnique({ where: { id: usage.inventoryId } });
            if (inv) {
                if (inv.quantity <= usage.quantityUsed) {
                    await tx.characterInventory.delete({ where: { id: usage.inventoryId } });
                } else {
                    await tx.characterInventory.update({
                        where: { id: usage.inventoryId },
                        data:  { quantity: { decrement: usage.quantityUsed } },
                    });
                }
            }
            await tx.questItemUsage.update({
                where: { id: usage.id },
                data:  { status: 'APPROVED', reviewedBy: actorId },
            });
            await tx.characterTransaction.create({ data: {
                characterId: usage.characterId,
                type:        'ITEM',
                delta:       -usage.quantityUsed,
                sourceType:  'QUEST',
                sourceId:    result.questId,
                note:        `Item used in quest: ${usage.itemName} ×${usage.quantityUsed}`,
                createdBy:   actorId,
            }});
        }

        // Write QuestStat
        const confirmedSignups = await tx.questSignup.findMany({
            where: { questId: result.questId, status: 'CONFIRMED' },
            select: { characterId: true },
        });
        const charIds = confirmedSignups.map(s => s.characterId);
        const charLevels = charIds.length ? await tx.characterClass.groupBy({
            by: ['characterId'],
            where: { characterId: { in: charIds } },
            _sum: { allocatedLevel: true },
        }) : [];
        const totalLevel = charLevels.reduce((s, c) => s + (c._sum.allocatedLevel ?? 0), 0);
        const avgPartyLevel = charIds.length ? totalLevel / charIds.length : 0;
        await tx.questStat.upsert({
            where:  { questId: result.questId },
            update: { avgPartyLevel, playerCount: charIds.length, completedAt: new Date() },
            create: { questId: result.questId, avgPartyLevel, playerCount: charIds.length, completedAt: new Date() },
        });

        await tx.questResult.update({ where: { id: resultId }, data: { status: 'APPROVED' } });
        await tx.quest.update({ where: { id: result.questId }, data: { status: 'COMPLETED' } });
        await logAudit(tx, {
            actorId, action: 'UPDATE', resourceKey: 'QuestResult', resourceId: resultId,
            before: { status: 'PENDING_APPROVAL' }, after: { status: 'APPROVED' },
        });
    });

    // Notify DM after transaction
    const dmP = await db.dMProfile.findUnique({ where: { id: result.quest?.dmProfileId ?? '' }, select: { userId: true } }).catch(() => null);
    if (dmP) await createNotification(dmP.userId, 'QUEST_RESULT_APPROVED', 'Quest result approved',
        'Your quest result has been approved and XP distributed.', `/dm/quests/${result.questId}`);
}

export async function rejectQuestResult(resultId: string, reviewNote: string, actorId: string) {
    const result = await db.questResult.findUnique({ where: { id: resultId } });
    if (!result) throw new NotFoundError('QuestResult', resultId);
    if (result.status !== 'PENDING_APPROVAL') throw new ValidationError('Result is not pending approval.');

    return db.$transaction(async (tx) => {
        await tx.questResult.update({
            where: { id: resultId },
            data:  { status: 'REJECTED', reviewNote },
        });

        // Revert quest to PENDING_RESULT so DM can resubmit
        await tx.quest.update({ where: { id: result.questId }, data: { status: 'PENDING_RESULT' } });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'QuestResult',
            resourceId:  resultId,
            before:      { status: 'PENDING_APPROVAL' },
            after:       { status: 'REJECTED', reviewNote },
        });
    });
}