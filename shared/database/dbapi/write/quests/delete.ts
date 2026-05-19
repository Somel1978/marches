// shared/database/dbapi/write/quests/delete.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function deleteQuest(id: string, actorId: string) {
    const quest = await db.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundError('Quest', id);

    return db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'Quest',
            resourceId:  id,
            before:      quest,
        });
        await tx.quest.delete({ where: { id } });
    });
}
