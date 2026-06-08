// shared/database/dbapi/read/news/get-wiki.ts
import { db } from '../../../index.ts';
import type { UserContext } from './get-world-journals.ts';

function wikiVisibilityFilter(ctx: UserContext) {
    const allowed: string[] = ['PUBLIC'];
    if (ctx.isAdmin)  allowed.push('ADMIN_ONLY', 'DM_ONLY');
    else if (ctx.isDM) allowed.push('DM_ONLY');
    return { in: allowed as any[] };
}

export async function getWikis(ctx: UserContext) {
    return db.platformWiki.findMany({
        where: {
            isPublished: ctx.isAdmin ? undefined : true,
            visibility:  wikiVisibilityFilter(ctx),
        },
        include: {
            sections: {
                where:   { visibility: wikiVisibilityFilter(ctx) },
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllWikis() {
    // Admin — no visibility filter
    return db.platformWiki.findMany({
        include: {
            sections: {
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getWikiById(id: string) {
    return db.platformWiki.findUnique({
        where:   { id },
        include: {
            sections: {
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' } } },
            },
        },
    });
}

export async function getWikiPageById(pageId: string) {
    return db.platformWikiPage.findUnique({
        where:   { id: pageId },
        include: { section: { include: { wiki: true } } },
    });
}