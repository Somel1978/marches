// shared/database/dbapi/read/dms/get-all.ts
import { db } from '../../../index.ts';

export async function getAllDMProfiles() {
    const profiles = await db.dMProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: { preferredSystems: true },
    });

    const userIds = profiles.map(p => p.userId);
    const users   = await db.user.findMany({
        where:  { id: { in: userIds } },
        select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return profiles.map(p => ({ ...p, user: userMap[p.userId] ?? null }));
}

export async function getAllRoleRequests() {
    const requests = await db.roleRequest.findMany({
        orderBy: { createdAt: 'desc' },
    });

    const userIds    = [...new Set([...requests.map(r => r.userId), ...requests.map(r => r.reviewedBy).filter(Boolean) as string[]])];
    const roleIds    = [...new Set(requests.map(r => r.roleId))];

    const [users, roles] = await Promise.all([
        db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
        db.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } }),
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));

    return requests.map(r => ({
        ...r,
        user:       userMap[r.userId]       ?? null,
        role:       roleMap[r.roleId]       ?? null,
        reviewedByUser: r.reviewedBy ? (userMap[r.reviewedBy] ?? null) : null,
    }));
}
