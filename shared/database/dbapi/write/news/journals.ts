// shared/database/dbapi/write/news/journals.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

// Journals
export async function createJournal(input: {
    title: string; icon?: string; description?: string;
    sortOrder?: number; worldIds?: string[]; roleIds?: string[];
}, actorId: string) {
    const j = await db.journal.create({ data: {
        title: input.title, icon: input.icon ?? null,
        description: input.description ?? null, sortOrder: input.sortOrder ?? 0,
        worldIds: input.worldIds ?? [], roleIds: input.roleIds ?? [],
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'Journal', resourceId: j.id, after: j });
    return j;
}

export async function updateJournal(id: string, input: {
    title?: string; icon?: string | null; description?: string | null;
    sortOrder?: number; isPublished?: boolean; worldIds?: string[]; roleIds?: string[];
}, actorId: string) {
    const before = await db.journal.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Journal', id);
    const j = await db.journal.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'Journal', resourceId: id, before, after: j });
    return j;
}

export async function deleteJournal(id: string, actorId: string) {
    const j = await db.journal.findUnique({ where: { id } });
    if (!j) throw new NotFoundError('Journal', id);
    await db.journal.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'Journal', resourceId: id, before: j });
}

// Sections
export async function createSection(input: {
    journalId: string; title: string; icon?: string; sortOrder?: number;
}, actorId: string) {
    return db.journalSection.create({ data: {
        journalId: input.journalId, title: input.title,
        icon: input.icon ?? null, sortOrder: input.sortOrder ?? 0,
    }});
}

export async function updateSection(id: string, input: {
    title?: string; icon?: string | null; sortOrder?: number;
}) {
    return db.journalSection.update({ where: { id }, data: input });
}

export async function deleteSection(id: string) {
    return db.journalSection.delete({ where: { id } });
}

// Pages
export async function createPage(input: {
    sectionId: string; title: string; content?: string; sortOrder?: number;
}, actorId: string) {
    return db.journalPage.create({ data: {
        sectionId: input.sectionId, title: input.title,
        content: input.content ?? '', sortOrder: input.sortOrder ?? 0, createdBy: actorId,
    }});
}

export async function updatePage(id: string, input: {
    title?: string; content?: string; sortOrder?: number;
}) {
    return db.journalPage.update({ where: { id }, data: input });
}

export async function deletePage(id: string) {
    return db.journalPage.delete({ where: { id } });
}
