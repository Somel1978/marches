// shared/database/dbapi/read/users/get-by-id.ts
import { db } from '../../../index.ts';

export async function getById(id: string) {
    return db.user.findUnique({
        where: { id },
        select: {
            id:            true,
            name:          true,
            email:         true,
            emailVerified: true,
            image:         true,
            discordHandle: true,
            mobile:        true,
            createdAt:     true,
            updatedAt:     true,
            userRoles: {
                select: {
                    assignedAt: true,
                    role: { select: { id: true, name: true, description: true } },
                },
            },
        },
    });
}

export async function getUserByDiscordId(discordId: string) {
    return db.user.findFirst({ where: { discordId } });
}

export async function getUserRoleIds(userId: string): Promise<string[]> {
    const rows = await db.userRole.findMany({ where: { userId }, select: { roleId: true } });
    return rows.map(r => r.roleId);
}