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
