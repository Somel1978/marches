// shared/database/dbapi/read/dms/get-by-id.ts
import { db } from '../../../index.ts';

export async function getDMProfileById(id: string) {
    return db.dMProfile.findUnique({
        where:   { id },
        include: { preferredSystems: true },
    });
}

export async function getDMProfileByUserId(userId: string) {
    return db.dMProfile.findUnique({
        where:   { userId },
        include: { preferredSystems: true },
    });
}

export async function getPendingRoleRequestByUser(userId: string) {
    return db.roleRequest.findFirst({
        where:   { userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getLatestRoleRequestByUser(userId: string) {
    return db.roleRequest.findFirst({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
    });
}