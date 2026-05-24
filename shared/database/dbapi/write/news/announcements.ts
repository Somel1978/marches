// shared/database/dbapi/write/news/announcements.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function createAnnouncement(input: {
    title: string; content: string; type: string;
    tags?: string[]; scheduledAt?: Date | null; expiresAt?: Date | null;
    isPublished?: boolean;
}, actorId: string) {
    const a = await db.announcement.create({ data: {
        title:       input.title,
        content:     input.content,
        type:        input.type        as any,
        tags:        input.tags        ?? [],
        scheduledAt: input.scheduledAt ?? null,
        expiresAt:   input.expiresAt   ?? null,
        isPublished: input.isPublished ?? false,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy:   actorId,
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'Announcement', resourceId: a.id, after: a });
    return a;
}

export async function updateAnnouncement(id: string, input: {
    title?: string; content?: string; type?: string; tags?: string[];
    scheduledAt?: Date | null; expiresAt?: Date | null; isPublished?: boolean;
}, actorId: string) {
    const before = await db.announcement.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Announcement', id);
    const data: any = { ...input };
    if (input.type) data.type = input.type as any;
    if (input.isPublished && !before.isPublished) data.publishedAt = new Date();
    const a = await db.announcement.update({ where: { id }, data });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'Announcement', resourceId: id, before, after: a });
    return a;
}

export async function deleteAnnouncement(id: string, actorId: string) {
    const a = await db.announcement.findUnique({ where: { id } });
    if (!a) throw new NotFoundError('Announcement', id);
    await db.announcement.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'Announcement', resourceId: id, before: a });
}
