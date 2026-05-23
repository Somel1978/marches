// shared/database/dbapi/write/quests/update-status.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { QuestStatus } from '@prisma/client';

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

    return db.$transaction(async (tx) => {
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
}