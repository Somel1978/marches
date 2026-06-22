// shared/database/dbapi/write/quests/update-status.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { QuestStatus } from '@prisma/client';
import { queueDiscordNotification } from '../discord/dispatcher';
import { createNotificationsForWorldDMs, createNotification } from '../notifications/notifications.ts';

const VALID_TRANSITIONS: Partial<Record<QuestStatus, QuestStatus[]>> = {
    DRAFT:                   ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL:        ['PUBLISHED', 'DRAFT', 'CANCELLED'],   // rejection → DRAFT so DM can edit and resubmit
    PUBLISHED:               ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS:             ['PENDING_RESULT', 'CANCELLED'],
    PENDING_RESULT:          ['PENDING_RESULT_APPROVAL', 'CANCELLED'],
    PENDING_RESULT_APPROVAL: ['PENDING_RESULT_APPROVAL', 'COMPLETED', 'PENDING_RESULT', 'CANCELLED'],
};

export async function updateQuestStatus(
    id: string,
    status: QuestStatus,
    reviewNote: string | undefined,
    actorId: string,
) {
    const quest = await db.quest.findUnique({
        where:   { id },
        include: { result: { include: { characters: true } } },
    });
    if (!quest) throw new NotFoundError('Quest', id);

    const allowed = VALID_TRANSITIONS[quest.status] ?? [];
    if (!allowed.includes(status))
        throw new ValidationError(`Cannot transition from ${quest.status} to ${status}.`);

    // When cancelling from PENDING_RESULT_APPROVAL, void the pending result
    // and notify confirmed players so they know the quest outcome was cancelled
    const cancelFromResultApproval = status === 'CANCELLED' && quest.status === 'PENDING_RESULT_APPROVAL';
    const confirmedSignups = cancelFromResultApproval
        ? await db.questSignup.findMany({
            where: { questId: id, status: { in: ['CONFIRMED' as any] } },
        })
        : [];
    // Look up character userIds separately (cross-schema — no direct relation)
    const confirmedCharacterIds = confirmedSignups.map((s: any) => s.characterId);
    const confirmedChars = confirmedCharacterIds.length
        ? await db.character.findMany({ where: { id: { in: confirmedCharacterIds } }, select: { id: true, userId: true } })
        : [];
    const charUserMap = Object.fromEntries(confirmedChars.map((c: any) => [c.id, c.userId]));

    const result = await db.$transaction(async (tx) => {
        const updated = await tx.quest.update({
            where: { id },
            data:  {
                status,
                reviewNote: reviewNote ?? null,
                ...(status === 'PUBLISHED' && { rewardAdjusted: false }),
            },
        });

        // Void result records when cancelling from PENDING_RESULT_APPROVAL
        if (cancelFromResultApproval && (quest as any).result) {
            await tx.questResultCharacter.deleteMany({ where: { resultId: (quest as any).result.id } });
            await tx.questResult.delete({ where: { id: (quest as any).result.id } });
        }

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

    // Notify confirmed players if quest cancelled from result approval stage
    if (cancelFromResultApproval) {
        for (const s of confirmedSignups) {
            const userId = charUserMap[(s as any).characterId];
            if (userId) {
                await createNotification(
                    userId,
                    'QUEST_CANCELLED',
                    'Quest cancelled',
                    `Quest "${quest.title}" was cancelled after results were submitted. Please contact your DM.`,
                    `/quests/${id}`,
                );
            }
        }
    }

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
            const dm     = await db.dMProfile.findUnique({ where: { id: quest.dmProfileId }, select: { userId: true } });
            const dmUser = dm ? await db.user.findUnique({ where: { id: dm.userId }, select: { name: true } }) : null;
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