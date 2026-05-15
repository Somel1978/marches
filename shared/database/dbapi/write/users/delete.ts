// shared/database/dbapi/write/users/delete.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ForbiddenError, ValidationError } from '@core/errors';

export async function deleteUser(id: string, actorId?: string) {
    const user = await db.user.findUnique({
        where:   { id },
        include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundError('User', id);

    // Cannot delete own account
    if (actorId && id === actorId) throw new ForbiddenError('delete', 'own account');

    // Cannot delete the last SUPERADMIN — would lock out the system
    const isSuperAdmin = user.userRoles.some(ur => ur.role.name === 'SUPERADMIN');
    if (isSuperAdmin) {
        const superAdminCount = await db.userRole.count({
            where: { role: { name: 'SUPERADMIN' } },
        });
        if (superAdminCount <= 1) {
            throw new ValidationError(
                'Cannot delete the last SUPERADMIN. Assign SUPERADMIN to another user first.'
            );
        }
    }

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