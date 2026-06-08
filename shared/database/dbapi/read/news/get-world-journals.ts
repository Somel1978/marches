// shared/database/dbapi/read/news/get-world-journals.ts
import { db } from '../../../index.ts';

// ── Visibility helper ─────────────────────────────────────────────────────────

export type UserContext = {
    isDM:    boolean;
    isAdmin: boolean;
    worldIds: string[]; // world IDs the user has a character in
};

function visibilityFilter(ctx: UserContext, worldId?: string) {
    const allowed: string[] = ['PUBLIC'];
    if (ctx.isAdmin)                                     allowed.push('ADMIN_ONLY', 'DM_ONLY', 'WORLD');
    else if (ctx.isDM)                                   allowed.push('DM_ONLY', 'WORLD');
    else if (worldId && ctx.worldIds.includes(worldId))  allowed.push('WORLD');
    return { in: allowed as any[] };
}

// ── World Journals ─────────────────────────────────────────────────────────────

export async function getWorldJournals(worldId: string, ctx: UserContext) {
    return db.worldJournal.findMany({
        where: {
            worldId,
            isPublished: ctx.isAdmin ? undefined : true,
            visibility:  visibilityFilter(ctx, worldId),
        },
        include: {
            sections: {
                where:   { visibility: visibilityFilter(ctx, worldId) },
                orderBy: { sortOrder: 'asc' },
                include: {
                    pages: { orderBy: { sortOrder: 'asc' } },
                },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllWorldJournals(worldId: string) {
    // Admin — no visibility filter
    return db.worldJournal.findMany({
        where:   { worldId },
        include: {
            sections: {
                orderBy: { sortOrder: 'asc' },
                include: { pages: { orderBy: { sortOrder: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getWorldJournalPage(pageId: string) {
    return db.worldJournalPage.findUnique({
        where:   { id: pageId },
        include: { section: { include: { journal: true } } },
    });
}