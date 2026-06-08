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

// Deprecated — use getWikis() or getWorldJournals() instead
export async function getJournalsForUser(_userRoleIds: string[], _worldIds: string[]) {
    return [];
}

// Deprecated — use getWikiPageById() or getWorldJournalPage() instead
export async function getJournalPage(_id: string) {
    return null;
}

// Deprecated — use getAllWikis() instead
export async function getAllJournals() {
    return [];
}