// shared/database/dbapi/write/roles/delete.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ForbiddenError } from '@core/errors';

export async function deleteRole(id: string, actorId?: string) {
    const role = await db.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role', id);
    if (role.name === 'SUPERADMIN') throw new ForbiddenError('delete', 'SUPERADMIN role');

    return db.$transaction(async (tx) => {
        await tx.role.delete({ where: { id } });

        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'Role',
            resourceId:  id,
            before:      role,
        });
    });
}