// shared/database/dbapi/read/notifications/get-notifications.ts
import { db } from '../../../index.ts';

export async function getUnreadNotifications(userId: string) {
    return db.notification.findMany({
        where:   { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take:    50,
    });
}

export async function getNotifications(userId: string, page = 1, perPage = 20) {
    const [items, total] = await db.$transaction([
        db.notification.findMany({
            where:   { userId },
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
        }),
        db.notification.count({ where: { userId } }),
    ]);
    return { items, total, unreadCount: await db.notification.count({ where: { userId, isRead: false } }) };
}
