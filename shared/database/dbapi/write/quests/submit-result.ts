// shared/database/dbapi/write/quests/submit-result.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotificationsForAdmins, createNotification } from '../notifications/notifications.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { queueDiscordNotification } from '../discord/dispatcher';
import { applyFutureBoostForQuest } from '../token-store/apply-boosts.ts';
import { applyProgressionChange } from '../characters/progression.ts';

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
    // Zero players is allowed — DM can close a quest with no participants

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
    // Milestone credits are per participant — never divided by party size.
    const milestonePerPlayer = Math.max(0, quest.milestoneAward);

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
                    missionXp:      quest.missionXp,
                    milestoneAward: quest.milestoneAward,
                    submittedBy,
                    status:      'PENDING_APPROVAL',
                    reviewNote:  null,
                },
            });
        } else {
            result = await tx.questResult.create({
                data: {
                    questId,
                    missionXp:      quest.missionXp,
                    milestoneAward: quest.milestoneAward,
                    submittedBy,
                    status:      'PENDING_APPROVAL',
                },
            });
        }

        await tx.questResultCharacter.createMany({
            data: confirmed.map(s => ({
                resultId:          result.id,
                characterId:       s.characterId,
                xpAwarded:         xpPerPlayer,
                goldAwarded:       goldPerPlayer,
                tokensAwarded:     tokensPerPlayer,
                milestonesAwarded: milestonePerPlayer,
            })),
        });

        // Transition quest to PENDING_RESULT_APPROVAL so DMs can see it in the approval queue
        if (quest.status !== 'PENDING_RESULT_APPROVAL') {
            await tx.quest.update({
                where: { id: questId },
                data:  { status: 'PENDING_RESULT_APPROVAL' },
            });
        }

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
        include: { characters: true, quest: { select: { title: true, dmProfileId: true, regionId: true } } },
    });
    if (!result) throw new NotFoundError('QuestResult', resultId);

    // Get worldId for boost world-scoping
    const questRegionId = (result as any).quest?.regionId ?? null;
    const questRegion   = questRegionId
        ? await db.region.findUnique({ where: { id: questRegionId }, select: { worldId: true } })
        : null;
    const questWorldId = questRegion?.worldId ?? null;
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
    // Milestone credits are per participant — never divided by party size.
    const currentMilestonePerPlayer = Math.max(0, result.milestoneAward);

    const settings = await getSettingsMap();
    const restDays  = Number(settings['character.restDays'] ?? 7);
    const restUntil = new Date(Date.now() + restDays * 24 * 60 * 60 * 1000);

    // Level detection is owned by applyProgressionChange — we only need identity here.
    const charIds    = result.characters.map(rc => rc.characterId);
    const characters = await db.character.findMany({
        where:  { id: { in: charIds } },
        select: { id: true, name: true, userId: true, gameSystemId: true },
    });
    const charMap = Object.fromEntries(characters.map(c => [c.id, c]));

    await db.$transaction(async (tx) => {
        // Handle ITEM rewards — randomised inside transaction to ensure consistency on retry
        const itemRewards = currentRewards.filter(r => r.type === 'ITEM') as any[];
        const itemGrantMap: Record<string, { id: string; name: string }[]> = {};
        for (const itemReward of itemRewards) {
            const itemWhere: any = { isAvailable: true };
            if (itemReward.itemRarity)   itemWhere.rarity   = { equals: itemReward.itemRarity };
            if (itemReward.itemCategory) itemWhere.category = { equals: itemReward.itemCategory };
            if (itemReward.itemMaxValue) itemWhere.buyPrice = { lte: itemReward.itemMaxValue };

            const eligibleItems = await tx.marketplaceItem.findMany({ where: itemWhere, select: { id: true, name: true } });
            if (eligibleItems.length === 0) {
                throw new ValidationError(
                    `Cannot approve: no marketplace items match the item reward filters ` +
                    `(rarity: ${itemReward.itemRarity ?? 'any'}, category: ${itemReward.itemCategory ?? 'any'}). ` +
                    `Please add matching items or update the quest reward filters.`
                );
            }
            for (const rc of result.characters) {
                const pick = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
                if (!itemGrantMap[rc.characterId]) itemGrantMap[rc.characterId] = [];
                itemGrantMap[rc.characterId].push({ id: pick.id, name: pick.name });
            }
        }
        for (const rc of result.characters) {
            const char       = charMap[rc.characterId];
            const xpToGrant     = currentXpPerPlayer; // mission + extra
            const goldToGrant = currentGoldPerPlayer;
            const tokensToGrant = currentTokensPerPlayer;
            const questTitle    = result.quest?.title ?? 'Quest';

            await tx.character.update({
                where: { id: rc.characterId },
                data: {
                    totalGold:    { increment: goldToGrant },
                    totalTokens:  { increment: tokensToGrant },
                },
            });

            // Apply FUTURE/BOTH token store boosts per quest (sourceType=QUEST so
            // deletions auto-revert). This writes XP directly, so it must land
            // before the level is resolved below.
            await applyFutureBoostForQuest(tx, rc.characterId, result.questId, xpToGrant, goldToGrant, questWorldId);

            // Mission XP + milestone credits. applyProgressionChange owns the
            // level decision, the rest state and the player notification.
            const progression = await applyProgressionChange(tx, {
                characterId:    rc.characterId,
                actorId,
                xpDelta:        currentMissionXpPerPlayer,
                milestoneDelta: currentMilestonePerPlayer,
                source:         { type: 'QUEST', id: result.questId, note: `Mission XP: ${questTitle}` },
                milestoneNote:  `Milestone: ${questTitle}`,
                restUntil,
            });
            // Bonus XP is logged separately so players can see the split.
            const bonus = currentExtraXpPerPlayer > 0
                ? await applyProgressionChange(tx, {
                    characterId: rc.characterId,
                    actorId,
                    xpDelta:     currentExtraXpPerPlayer,
                    source:      { type: 'QUEST', id: result.questId, note: `Bonus XP: ${questTitle}` },
                    restUntil,
                })
                : null;
            const leveledUp = (bonus ?? progression).changed === 'UP';

            // Gold transaction
            if (goldToGrant > 0) await tx.characterTransaction.create({ data: {
                characterId: rc.characterId, type: 'GOLD', delta: goldToGrant,
                sourceType: 'QUEST', sourceId: result.questId,
                note: `Quest reward: ${questTitle}`, createdBy: actorId,
            }});

            // Update QuestResultCharacter with final awarded amounts
            await tx.questResultCharacter.update({
                where: { id: rc.id },
                data:  {
                    xpAwarded:         xpToGrant,
                    goldAwarded:       goldToGrant,
                    tokensAwarded:     tokensToGrant,
                    milestonesAwarded: currentMilestonePerPlayer,
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

            // Level-up notification is sent by applyProgressionChange.
            if (char?.userId && !leveledUp) {
                await createNotification(char.userId, 'QUEST_COMPLETE', 'Quest completed',
                    `"${questTitle}" completed. Your character is resting until ${restUntil.toLocaleDateString()}.`, `/characters/${rc.characterId}`);
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
        const charLevels = charIds.length ? await tx.character.findMany({
            where:  { id: { in: charIds } },
            select: { level: true },
        }) : [];
        const totalLevel = charLevels.reduce((s: number, c: any) => s + (c.level ?? 0), 0);
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
    // Queue Discord notification for bot — reload characters to get itemGrantedName set during transaction
    try {
        const freshChars = await db.questResultCharacter.findMany({ where: { resultId: result.id } });
        await queueDiscordNotification('QUEST_RESULT', {
            questId:    result.questId,
            questTitle: result.quest?.title ?? '',
            worldId:    (result.quest as any)?.worldId ?? null,
            chars:      freshChars.map((rc: any) => ({
                characterName:   charMap[rc.characterId]?.name ?? rc.characterId,
                xpAwarded:       rc.xpAwarded,
                goldAwarded:     rc.goldAwarded,
                tokensAwarded:   rc.tokensAwarded,
                itemGrantedName: rc.itemGrantedName ?? null,
            })),
        });
    } catch {}

    if (dmP) await createNotification(dmP.userId, 'QUEST_RESULT_APPROVED', 'Quest result approved',
        'Your quest result has been approved and XP distributed.', `/dm/quests/${result.questId}`);
}

export async function rejectQuestResult(resultId: string, reviewNote: string, actorId: string) {
    const result = await db.questResult.findUnique({
        where:   { id: resultId },
        include: { quest: { select: { title: true, dmProfileId: true } } },
    });
    if (!result) throw new NotFoundError('QuestResult', resultId);
    if (result.status !== 'PENDING_APPROVAL') throw new ValidationError('Result is not pending approval.');

    await db.$transaction(async (tx) => {
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

    // Notify DM of rejection with review note
    const dm = await db.dMProfile.findUnique({
        where:  { id: result.quest?.dmProfileId ?? '' },
        select: { userId: true },
    }).catch(() => null);
    if (dm) {
        await createNotification(
            dm.userId,
            'QUEST_RESULT_REJECTED',
            'Quest result rejected',
            `Results for "${result.quest?.title}" were rejected.${reviewNote ? ` Reason: ${reviewNote}` : ''} Please review and resubmit.`,
            `/dm/quests/${result.questId}`,
        );
    }
}