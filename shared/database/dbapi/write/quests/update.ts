// shared/database/dbapi/write/quests/update.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { getSettingsMap } from '../../read/platform/get-settings.ts';

export async function updateQuest(
    id: string,
    input: {
        title?:       string;
        description?: string;
        rules?:       string;
        missionXp?:   number;
        minCapacity?: number;
        maxCapacity?: number;
        minLevel?:    number;
        maxLevel?:    number;
        regionId?:    string | null;
    },
    actorId: string,
) {
    const quest = await db.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundError('Quest', id);
    // Capacity, XP and levels can be edited at any time by DM or admin
    // Only rewards are restricted post-approval (handled in updateQuestRewards)

    if (input.minCapacity !== undefined || input.maxCapacity !== undefined) {
        const settings  = await getSettingsMap();
        const globalMin = Number(settings['quest.minCapacity'] ?? 2);
        const globalMax = Number(settings['quest.maxCapacity'] ?? 6);
        const min = input.minCapacity ?? quest.minCapacity;
        const max = input.maxCapacity ?? quest.maxCapacity;
        if (min < globalMin) throw new ValidationError(`Minimum capacity cannot be less than global minimum (${globalMin}).`);
        if (max > globalMax) throw new ValidationError(`Maximum capacity cannot exceed global maximum (${globalMax}).`);
        if (min > max)       throw new ValidationError('Minimum capacity cannot exceed maximum capacity.');
    }

    return db.$transaction(async (tx) => {
        const updated = await tx.quest.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Quest', resourceId: id, before: quest, after: updated });
        return updated;
    });
}

export async function updateQuestRewards(
    questId: string,
    rewards: { type: string; amount: number; itemId?: string; itemName?: string }[],
    actorId: string,
) {
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundError('Quest', questId);

    const wasApproved = quest.status === 'PUBLISHED' || quest.status === 'IN_PROGRESS';

    return db.$transaction(async (tx) => {
        await tx.questReward.deleteMany({ where: { questId } });
        await tx.questReward.createMany({
            data: rewards.map(r => ({
                questId,
                type:          r.type as any,
                amount:        r.amount,
                itemId:        r.itemId   ?? null,
                itemName:      r.itemName ?? null,
                rewardAdjusted: wasApproved,
            })),
        });

        // Flag quest for re-approval if rewards changed post-approval
        if (wasApproved) {
            await tx.quest.update({ where: { id: questId }, data: { rewardAdjusted: true, status: 'PENDING_APPROVAL' } });
        }

        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Quest', resourceId: questId, after: { rewards, rewardAdjusted: wasApproved } });
    });
}

export async function addCoDM(questId: string, dmProfileId: string, actorId: string) {
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundError('Quest', questId);

    return db.questDM.create({ data: { questId, dmProfileId, addedBy: actorId } });
}

export async function removeCoDM(questDMId: string, actorId: string) {
    const dm = await db.questDM.findUnique({ where: { id: questDMId } });
    if (!dm) throw new NotFoundError('QuestDM', questDMId);
    return db.questDM.delete({ where: { id: questDMId } });
}