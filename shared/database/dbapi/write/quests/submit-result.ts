// shared/database/dbapi/write/quests/submit-result.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';
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
    if (quest.status !== 'PENDING_RESULT') throw new ValidationError('Quest is not in PENDING_RESULT status.');
    if (quest.result)                      throw new ValidationError('Result already submitted.');

    const confirmed = quest.signups;
    if (confirmed.length === 0) throw new ValidationError('No confirmed players to distribute XP to.');

    const count        = confirmed.length;
    const xpPerPlayer  = Math.max(1, Math.floor(quest.missionXp / count));

    // Calculate divisible rewards per player
    const rewards = await db.questReward.findMany({ where: { questId } });
    const goldReward   = rewards.find(r => r.type === 'GOLD');
    const tokenReward  = rewards.find(r => r.type === 'TOKEN');
    const goldPerPlayer   = goldReward  ? Math.max(1, Math.floor(goldReward.amount  / count)) : 0;
    const tokensPerPlayer = tokenReward ? Math.max(1, Math.floor(tokenReward.amount / count)) : 0;

    await createNotificationsForAdmins(
        'QUEST_RESULT_PENDING', 'Quest result awaiting approval',
        `Results submitted for "${quest.title}".`,
        `/quests/${questId}`,
    );

    return db.$transaction(async (tx) => {
        const result = await tx.questResult.create({
            data: {
                questId,
                missionXp:   quest.missionXp,
                submittedBy,
                status:      'PENDING_APPROVAL',
            },
        });

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
        include: { characters: true, quest: { include: { rewards: true } } },
    });
    if (!result) throw new NotFoundError('QuestResult', resultId);
    if (result.status !== 'PENDING_APPROVAL') throw new ValidationError('Result is not pending approval.');

    return db.$transaction(async (tx) => {
        // Apply XP to each character
        for (const rc of result.characters) {
            await tx.character.update({
                where: { id: rc.characterId },
                data:  { totalXp: { increment: rc.xpAwarded }, totalGold: { increment: rc.goldAwarded }, totalTokens: { increment: rc.tokensAwarded } },
            });

            await tx.characterTransaction.create({
                data: {
                    characterId: rc.characterId,
                    type:        'REWARD',
                    delta:       rc.xpAwarded,
                    sourceType:  'QUEST',
                    sourceId:    result.questId,
                    note:        `Quest completed: ${result.quest.title}`,
                    createdBy:   actorId,
                },
            });
        }

        // Update result and quest status
        await tx.questResult.update({ where: { id: resultId }, data: { status: 'APPROVED' } });
        await tx.quest.update({ where: { id: result.questId }, data: { status: 'COMPLETED' } });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'QuestResult',
            resourceId:  resultId,
            before:      { status: 'PENDING_APPROVAL' },
            after:       { status: 'APPROVED' },
        });
    });
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