// shared/database/dbapi/write/characters/slot-grant.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function grantCharacterSlot(
    userId: string,
    delta: number,
    reason: string,
    actorId: string,
) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);
    if (!reason?.trim()) throw new ValidationError('Reason is required for slot grants.');
    if (delta === 0) throw new ValidationError('Delta cannot be zero.');

    return db.$transaction(async (tx) => {
        const grant = await tx.characterSlotGrant.create({
            data: { userId, delta, reason, grantedBy: actorId },
        });

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'Character',
            resourceId:  userId,
            after:       { type: 'slot_grant', delta, reason },
        });

        return grant;
    });
}
