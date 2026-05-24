// shared/database/dbapi/read/news/get-news.ts
import { db } from '../../../index.ts';

export async function getAnnouncements({ type, tag, includeExpired = false }: {
    type?: string; tag?: string; includeExpired?: boolean;
} = {}) {
    const where: any = { isPublished: true };
    if (type) where.type = type as any;
    if (tag)  where.tags = { has: tag };
    if (!includeExpired) {
        where.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }];
    }
    return db.announcement.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function getAllAnnouncements() {
    return db.announcement.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getAnnouncementById(id: string) {
    return db.announcement.findUnique({ where: { id } });
}

export async function getJournalsForUser(userRoleIds: string[], worldIds: string[]) {
    const journals = await db.journal.findMany({
        where:   { isPublished: true },
        include: {
            sections: {
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' }, select: { id: true, title: true, sortOrder: true } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });

    return journals.filter(j => {
        const worldOk = j.worldIds.length === 0 || j.worldIds.some(w => worldIds.includes(w));
        const roleOk  = j.roleIds.length  === 0 || j.roleIds.some(r => userRoleIds.includes(r));
        return worldOk && roleOk;
    });
}

export async function getJournalPage(id: string) {
    return db.journalPage.findUnique({
        where:   { id },
        include: { section: { include: { journal: true } } },
    });
}

export async function getAllJournals() {
    return db.journal.findMany({
        include: {
            sections: {
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}