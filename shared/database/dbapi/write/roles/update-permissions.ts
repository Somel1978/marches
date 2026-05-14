// shared/database/dbapi/write/roles/update-permissions.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { AccessLevel } from '@prisma/client';

export type PermissionInput = {
    resourceKey: string;
    canCreate:   AccessLevel;
    canRead:     AccessLevel;
    canUpdate:   AccessLevel;
    canDelete:   AccessLevel;
};

// Replaces the full permission set for a role atomically.
// Validates resourceKey values against platform.Resource before writing.
// Called by the admin permission matrix UI on save.
export async function updatePermissions(roleId: string, permissions: PermissionInput[], actorId?: string) {
    const role = await db.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
    if (!role) throw new NotFoundError('Role', roleId);

    // Validate all resourceKeys exist in platform
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

// Replaces the full role set for a user atomically.
export async function setUserRoles(userId: string, roleIds: string[], actorId?: string) {
    const user = await db.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } });
    if (!user) throw new NotFoundError('User', userId);

    return db.$transaction(async (tx) => {
        const before = user.userRoles;
        await tx.userRole.deleteMany({ where: { userId } });

        if (roleIds.length) {
            await tx.userRole.createMany({ data: roleIds.map(roleId => ({ userId, roleId, assignedBy: actorId })) });
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