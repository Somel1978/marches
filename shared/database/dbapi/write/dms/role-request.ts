// shared/database/dbapi/write/dms/role-request.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError, ValidationError } from '@core/errors';

export async function createRoleRequest(
    userId: string,
    roleId: string,
    reason: string,
) {
    if (!reason?.trim()) throw new ValidationError('Reason is required.');

    const existing = await db.roleRequest.findFirst({
        where: { userId, status: 'PENDING' },
    });
    if (existing) throw new ConflictError('You already have a pending role request.');

    return db.roleRequest.create({
        data: { userId, roleId, reason },
    });
}

export async function approveRoleRequest(id: string, reviewNote: string | undefined, actorId: string) {
    const request = await db.roleRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('RoleRequest', id);
    if (request.status !== 'PENDING') throw new ValidationError('Request is not pending.');

    return db.$transaction(async (tx) => {
        const updated = await tx.roleRequest.update({
            where: { id },
            data:  { status: 'APPROVED', reviewedBy: actorId, reviewNote: reviewNote ?? null },
        });

        // Assign the role
        const userRoles = await tx.userRole.findMany({ where: { userId: request.userId } });
        const hasRole   = userRoles.some(ur => ur.roleId === request.roleId);
        if (!hasRole) {
            await tx.userRole.create({ data: { userId: request.userId, roleId: request.roleId } });
        }

        // Create DM profile if role is DM
        const role = await tx.role.findUnique({ where: { id: request.roleId } });
        if (role?.name === 'DM') {
            const existing = await tx.dMProfile.findUnique({ where: { userId: request.userId } });
            if (!existing) {
                await tx.dMProfile.create({ data: { userId: request.userId } });
            } else {
                await tx.dMProfile.update({ where: { userId: request.userId }, data: { isActive: true } });
            }
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'RoleRequest',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: 'APPROVED' },
        });

        return updated;
    });
}

export async function rejectRoleRequest(id: string, reviewNote: string, actorId: string) {
    const request = await db.roleRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('RoleRequest', id);
    if (request.status !== 'PENDING') throw new ValidationError('Request is not pending.');
    if (!reviewNote?.trim()) throw new ValidationError('Review note is required when rejecting.');

    return db.$transaction(async (tx) => {
        const updated = await tx.roleRequest.update({
            where: { id },
            data:  { status: 'REJECTED', reviewedBy: actorId, reviewNote },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'RoleRequest',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: 'REJECTED', reviewNote },
        });

        return updated;
    });
}

export async function deleteRoleRequest(id: string, actorId: string) {
    const request = await db.roleRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('RoleRequest', id);

    return db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'RoleRequest',
            resourceId:  id,
            before:      request,
        });
        await tx.roleRequest.delete({ where: { id } });
    });
}