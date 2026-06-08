// shared/database/dbapi/write/news/world-journals.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

type Visibility = 'PUBLIC' | 'WORLD' | 'DM_ONLY' | 'ADMIN_ONLY';

// ── Journal CRUD ──────────────────────────────────────────────────────────────

export async function createWorldJournal(input: {
    worldId: string; title: string; icon?: string; description?: string;
    sortOrder?: number; visibility?: Visibility;
}, actorId: string) {
    const j = await db.worldJournal.create({
        data: {
            worldId:     input.worldId,
            title:       input.title,
            icon:        input.icon        ?? null,
            description: input.description ?? null,
            sortOrder:   input.sortOrder   ?? 0,
            visibility:  input.visibility  ?? 'PUBLIC',
            isPublished: false,
            createdBy:   actorId,
        },
    });
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'Journal', resourceId: j.id, after: j });
    return j;
}

export async function updateWorldJournal(id: string, input: Partial<{
    title: string; icon: string | null; description: string | null;
    sortOrder: number; isPublished: boolean; visibility: Visibility;
}>, actorId: string) {
    const before = await db.worldJournal.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WorldJournal', id);
    const j = await db.worldJournal.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'Journal', resourceId: id, before, after: j });
    return j;
}

export async function deleteWorldJournal(id: string, actorId: string) {
    const before = await db.worldJournal.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WorldJournal', id);
    await db.worldJournal.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'Journal', resourceId: id, before });
}

// ── Section CRUD ──────────────────────────────────────────────────────────────

export async function createWorldJournalSection(input: {
    journalId: string; title: string; icon?: string;
    sortOrder?: number; visibility?: Visibility;
}, actorId: string) {
    return db.worldJournalSection.create({
        data: {
            journalId:  input.journalId,
            title:      input.title,
            icon:       input.icon       ?? null,
            sortOrder:  input.sortOrder  ?? 0,
            visibility: input.visibility ?? 'PUBLIC',
        },
    });
}

export async function updateWorldJournalSection(id: string, input: Partial<{
    title: string; icon: string | null; sortOrder: number; visibility: Visibility;
}>, actorId: string) {
    const before = await db.worldJournalSection.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WorldJournalSection', id);
    return db.worldJournalSection.update({ where: { id }, data: input });
}

export async function deleteWorldJournalSection(id: string, actorId: string) {
    const before = await db.worldJournalSection.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WorldJournalSection', id);
    await db.worldJournalSection.delete({ where: { id } });
}

// ── Page CRUD ─────────────────────────────────────────────────────────────────

export async function createWorldJournalPage(input: {
    sectionId: string; title: string; content?: string; sortOrder?: number;
}, actorId: string) {
    return db.worldJournalPage.create({
        data: {
            sectionId: input.sectionId,
            title:     input.title,
            content:   input.content   ?? '',
            sortOrder: input.sortOrder ?? 0,
            createdBy: actorId,
        },
    });
}

export async function updateWorldJournalPage(id: string, input: Partial<{
    title: string; content: string; sortOrder: number;
}>, actorId: string) {
    const before = await db.worldJournalPage.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('WorldJournalPage', id);
    return db.worldJournalPage.update({ where: { id }, data: input });
}

export async function deleteWorldJournalPage(id: string, actorId: string) {
    await db.worldJournalPage.delete({ where: { id } });
}