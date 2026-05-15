// shared/database/dbapi/write/roles/update-permissions.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError, ForbiddenError } from '@core/errors';
import type { AccessLevel } from '@prisma/client';

export type PermissionInput = {
    resourceKey: string;
    canCreate:   AccessLevel;
    canRead:     AccessLevel;
    canUpdate:   AccessLevel;
    canDelete:   AccessLevel;
};

export async function updatePermissions(roleId: string, permissions: PermissionInput[], actorId?: string) {
    const role = await db.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
    if (!role) throw new NotFoundError('Role', roleId);

    if (permissions.length) {
        const keys      = permissions.map(p => p.resourceKey);
        const resources = await db.resource.findMany({ where: { key: { in: keys } }, select: { key: true } });
        const found     = new Set(resources.map(r => r.key));
        const missing   = keys.filter(k => !found.has(k));
        if (missing.length) throw new ValidationError(`Unknown resource keys: ${missing.join(', ')}`);
    }

    return db.$transaction(async (tx) => {
        const before = role.permissions;
        await tx.rolePermission.deleteMany({ where: { roleId } });

        if (permissions.length) {
            await tx.rolePermission.createMany({ data: permissions.map(p => ({ roleId, ...p })) });
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Permission',
            resourceId:  roleId,
            before,
            after:       permissions,
        });

        return tx.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
    });
}

export async function setUserRoles(userId: string, roleIds: string[], actorId?: string) {
    const user = await db.user.findUnique({
        where:   { id: userId },
        include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundError('User', userId);

    const currentRoleNames = user.userRoles.map(ur => ur.role.name);
    const isSuperAdmin     = currentRoleNames.includes('SUPERADMIN');

    // Resolve incoming role names from IDs in one query
    const incomingRoles = roleIds.length
        ? await db.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } })
        : [];
    const incomingRoleNames = incomingRoles.map(r => r.name);
    const willBeSuperAdmin  = incomingRoleNames.includes('SUPERADMIN');

    // Prevent removing own SUPERADMIN role
    if (actorId === userId && isSuperAdmin && !willBeSuperAdmin) {
        throw new ForbiddenError('remove', 'your own SUPERADMIN role');
    }

    // Prevent removing SUPERADMIN from the last admin user
    if (isSuperAdmin && !willBeSuperAdmin) {
        const superAdminCount = await db.userRole.count({
            where: { role: { name: 'SUPERADMIN' } },
        });
        if (superAdminCount <= 1) {
            throw new ValidationError(
                'Cannot remove SUPERADMIN from the last admin. Assign SUPERADMIN to another user first.'
            );
        }
    }

    return db.$transaction(async (tx) => {
        const before = user.userRoles;
        await tx.userRole.deleteMany({ where: { userId } });

        if (roleIds.length) {
            await tx.userRole.createMany({
                data: roleIds.map(roleId => ({ userId, roleId, assignedBy: actorId })),
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'ASSIGN',
            resourceKey: 'Role',
            resourceId:  userId,
            before,
            after:       roleIds,
        });
    });
}