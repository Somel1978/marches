// shared/database/dbapi/write/notifications/notifications.ts
import { db } from '../../../index.ts';

export async function createNotification(
    userId:    string,
    type:      string,
    title:     string,
    message:   string,
    actionUrl?: string,
) {
    return db.notification.create({
        data: { userId, type, title, message, actionUrl: actionUrl ?? null },
    });
}

export async function createNotificationsForAdmins(
    type:      string,
    title:     string,
    message:   string,
    actionUrl?: string,
) {
    // Find all users with SUPERADMIN role
    const adminRoles = await db.role.findMany({
        where: { name: { in: ['SUPERADMIN'] } },
        include: { userRoles: { select: { userId: true } } },
    });
    const adminIds = [...new Set(adminRoles.flatMap(r => r.userRoles.map(ur => ur.userId)))];
    if (!adminIds.length) return;

    await db.notification.createMany({
        data: adminIds.map(userId => ({ userId, type, title, message, actionUrl: actionUrl ?? null })),
        skipDuplicates: true,
    });
}

export async function createNotificationsForWorldDMs(
    worldId:   string,
    type:      string,
    title:     string,
    message:   string,
    actionUrl?: string,
) {
    // Find all DMs with canManage on this world
    const assignments = await db.worldDM.findMany({
        where:   { worldId, canManage: true },
        select:  { dmProfileId: true },
    });
    if (!assignments.length) return;

    const dmProfileIds = assignments.map(a => a.dmProfileId);
    const dmProfiles   = await db.dMProfile.findMany({
        where:  { id: { in: dmProfileIds } },
        select: { userId: true },
    });

    const userIds = [...new Set(dmProfiles.map(p => p.userId))];
    if (!userIds.length) return;

    await db.notification.createMany({
        data: userIds.map(userId => ({ userId, type, title, message, actionUrl: actionUrl ?? null })),
        skipDuplicates: true,
    });
}

export async function markNotificationRead(id: string, userId: string) {
    return db.notification.updateMany({
        where: { id, userId },
        data:  { isRead: true },
    });
}

export async function markAllNotificationsRead(userId: string) {
    return db.notification.updateMany({
        where: { userId, isRead: false },
        data:  { isRead: true },
    });
}