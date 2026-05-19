// shared/database/dbapi/write/dms/dm-profile.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function updateDMProfile(
    id: string,
    input: {
        bio?:         string | null;
        specialties?: string | null;
        rules?:       string | null;
        isPublic?:    boolean;
        isActive?:    boolean;
        preferredSystemIds?: string[];
    },
    actorId?: string,
) {
    const profile = await db.dMProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundError('DMProfile', id);

    return db.$transaction(async (tx) => {
        const { preferredSystemIds, ...profileData } = input;

        const updated = await tx.dMProfile.update({
            where: { id },
            data:  profileData,
        });

        if (preferredSystemIds !== undefined) {
            await tx.dMGameSystem.deleteMany({ where: { dmProfileId: id } });
            if (preferredSystemIds.length > 0) {
                await tx.dMGameSystem.createMany({
                    data: preferredSystemIds.map(gsId => ({ dmProfileId: id, gameSystemId: gsId })),
                });
            }
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'DMProfile',
            resourceId:  id,
            before:      profile,
            after:       updated,
        });

        return updated;
    });
}

export async function revokeDMRole(
    dmProfileId: string,
    actorId: string,
) {
    const profile = await db.dMProfile.findUnique({ where: { id: dmProfileId } });
    if (!profile) throw new NotFoundError('DMProfile', dmProfileId);

    return db.$transaction(async (tx) => {
        // Deactivate DM profile
        await tx.dMProfile.update({
            where: { id: dmProfileId },
            data:  { isActive: false },
        });

        // Remove DM role from user
        const dmRole = await tx.role.findUnique({ where: { name: 'DM' } });
        if (dmRole) {
            await tx.userRole.deleteMany({
                where: { userId: profile.userId, roleId: dmRole.id },
            });

            // Update the approved role request so player sees revoked state
            await tx.roleRequest.updateMany({
                where:  { userId: profile.userId, roleId: dmRole.id, status: 'APPROVED' },
                data:   { status: 'REJECTED', reviewNote: 'DM role revoked by admin', reviewedBy: actorId },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'DMProfile',
            resourceId:  dmProfileId,
            before:      { isActive: true },
            after:       { isActive: false, note: 'DM role revoked' },
        });
    });
}