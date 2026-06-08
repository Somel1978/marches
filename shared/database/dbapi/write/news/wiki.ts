// shared/database/dbapi/write/news/wiki.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

type Visibility = 'PUBLIC' | 'WORLD' | 'DM_ONLY' | 'ADMIN_ONLY';

// ── Wiki CRUD ─────────────────────────────────────────────────────────────────

export async function createWiki(input: {
    title: string; icon?: string; description?: string;
    sortOrder?: number; visibility?: Visibility;
}, actorId: string) {
    const w = await db.platformWiki.create({
        data: {
            title:       input.title,
            icon:        input.icon        ?? null,
            description: input.description ?? null,
            sortOrder:   input.sortOrder   ?? 0,
            visibility:  input.visibility  ?? 'PUBLIC',
            isPublished: false,
            createdBy:   actorId,
        },
    });
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'Journal', resourceId: w.id, after: w });
    return w;
}

export async function updateWiki(id: string, input: Partial<{
    title: string; icon: string | null; description: string | null;
    sortOrder: number; isPublished: boolean; visibility: Visibility;
}>, actorId: string) {
    const before = await db.platformWiki.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Wiki', id);
    const w = await db.platformWiki.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'Journal', resourceId: id, before, after: w });
    return w;
}

export async function deleteWiki(id: string, actorId: string) {
    const before = await db.platformWiki.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Wiki', id);
    await db.platformWiki.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'Journal', resourceId: id, before });
}

// ── Section CRUD ──────────────────────────────────────────────────────────────

export async function createWikiSection(input: {
    wikiId: string; title: string; icon?: string;
    sortOrder?: number; visibility?: Visibility;
}, actorId: string) {
    return db.platformWikiSection.create({
        data: {
            wikiId:     input.wikiId,
            title:      input.title,
            icon:       input.icon       ?? null,
            sortOrder:  input.sortOrder  ?? 0,
            visibility: input.visibility ?? 'PUBLIC',
        },
    });
}

export async function updateWikiSection(id: string, input: Partial<{
    title: string; icon: string | null; sortOrder: number; visibility: Visibility;
}>, actorId: string) {
    const before = await db.platformWikiSection.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WikiSection', id);
    return db.platformWikiSection.update({ where: { id }, data: input });
}

export async function deleteWikiSection(id: string, actorId: string) {
    await db.platformWikiSection.delete({ where: { id } });
}

// ── Page CRUD ─────────────────────────────────────────────────────────────────

export async function createWikiPage(input: {
    sectionId: string; title: string; content?: string; sortOrder?: number;
}, actorId: string) {
    return db.platformWikiPage.create({
        data: {
            sectionId: input.sectionId,
            title:     input.title,
            content:   input.content   ?? '',
            sortOrder: input.sortOrder ?? 0,
            createdBy: actorId,
        },
    });
}

export async function updateWikiPage(id: string, input: Partial<{
    title: string; content: string; sortOrder: number;
}>, actorId: string) {
    const before = await db.platformWikiPage.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WikiPage', id);
    return db.platformWikiPage.update({ where: { id }, data: input });
}

export async function deleteWikiPage(id: string, actorId: string) {
    await db.platformWikiPage.delete({ where: { id } });
}