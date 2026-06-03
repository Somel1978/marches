// shared/database/dbapi/write/quests/update-status.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { QuestStatus } from '@prisma/client';
import { queueDiscordNotification } from '../discord/dispatcher';
import { createNotificationsForWorldDMs } from '../notifications/notifications.ts';

const VALID_TRANSITIONS: Partial<Record<QuestStatus, QuestStatus[]>> = {
    DRAFT:            ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL:        ['PUBLISHED', 'CANCELLED'],
    PUBLISHED:               ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS:             ['PENDING_RESULT', 'CANCELLED'],
    PENDING_RESULT:          ['PENDING_RESULT_APPROVAL', 'CANCELLED'],
    PENDING_RESULT_APPROVAL: ['COMPLETED', 'PENDING_RESULT', 'CANCELLED'],
};

export async function updateQuestStatus(
    id: string,
    status: QuestStatus,
    reviewNote: string | undefined,
    actorId: string,
) {
    const quest = await db.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundError('Quest', id);

    const allowed = VALID_TRANSITIONS[quest.status] ?? [];
    if (!allowed.includes(status))
        throw new ValidationError(`Cannot transition from ${quest.status} to ${status}.`);

    const result = await db.$transaction(async (tx) => {
        const updated = await tx.quest.update({
            where: { id },
            data:  {
                status,
                reviewNote: reviewNote ?? null,
                // Clear rewardAdjusted flag when re-approved
                ...(status === 'PUBLISHED' && { rewardAdjusted: false }),
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Quest',
            resourceId:  id,
            before:      { status: quest.status },
            after:       { status, reviewNote },
        });

        return updated;
    });

    // Queue Discord notifications outside transaction
    try {
        if (status === 'PUBLISHED') {
            await queueDiscordNotification('QUEST_PUBLISHED', {
                questId:     id,
                title:       quest.title,
                description: quest.description ?? '',
                minLevel:    quest.minLevel,
                maxLevel:    quest.maxLevel,
                missionXp:   quest.missionXp,
                maxCapacity: quest.maxCapacity,
                worldId:     (quest as any).worldId ?? null,
                scheduledAt: quest.scheduledAt?.toISOString() ?? null,
                signupDeadline: (quest as any).signupDeadline?.toISOString() ?? null,
            });
        } else if (status === 'IN_PROGRESS') {
            await queueDiscordNotification('QUEST_STARTED', {
                questId: id,
                title:   quest.title,
                worldId: (quest as any).worldId ?? null,
            });
        } else if (status === 'PENDING_APPROVAL') {
            const worldId = (quest as any).worldId;
            if (worldId) {
                await createNotificationsForWorldDMs(
                    worldId,
                    'QUEST_PENDING_APPROVAL', 'Quest awaiting approval',
                    `Quest "${quest.title}" has been submitted for approval.`,
                    `/dm/worlds/${worldId}/quests?status=PENDING_APPROVAL`,
                );
            }
            const dm       = await db.dMProfile.findUnique({ where: { id: quest.dmProfileId }, select: { userId: true } });
            const dmUser   = dm ? await db.user.findUnique({ where: { id: dm.userId }, select: { name: true } }) : null;
            await queueDiscordNotification('QUEST_PENDING_APPROVAL', {
                questId:   id,
                title:     quest.title,
                dmName:    dmUser?.name ?? '',
                minLevel:  quest.minLevel,
                maxLevel:  quest.maxLevel,
                missionXp: quest.missionXp,
                worldId:   (quest as any).worldId ?? null,
            });
        } else if (status === 'PENDING_RESULT_APPROVAL') {
            const worldId2 = (quest as any).worldId;
            if (worldId2) {
                await createNotificationsForWorldDMs(
                    worldId2,
                    'QUEST_RESULT_PENDING', 'Quest result awaiting approval',
                    `Quest "${quest.title}" result has been submitted for review.`,
                    `/dm/worlds/${worldId2}/quests?status=PENDING_RESULT_APPROVAL`,
                );
            }
            await queueDiscordNotification('QUEST_RESULT_PENDING', {
                questId: id,
                title:   quest.title,
                worldId: (quest as any).worldId ?? null,
            });
        }
    } catch { /* discord not running */ }

    return result;
}