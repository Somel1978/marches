// shared/database/dbapi/write/users/delete.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ForbiddenError } from '@core/errors';

export async function deleteUser(id: string, actorId?: string) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User', id);
    if (actorId && id === actorId) throw new ForbiddenError('delete', 'own account');

    return db.$transaction(async (tx) => {
        await tx.user.delete({ where: { id } });

        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'User',
            resourceId:  id,
            before:      { id: user.id, name: user.name, email: user.email },
        });
    });
}