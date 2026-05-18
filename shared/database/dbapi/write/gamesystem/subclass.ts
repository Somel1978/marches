// shared/database/dbapi/write/gamesystem/subclass.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createSubclass(
    input: { classId: string; name: string; description?: string; source?: string; link?: string; sortOrder?: number },
    actorId?: string,
) {
    const cls = await db.class.findUnique({ where: { id: input.classId } });
    if (!cls) throw new NotFoundError('Class', input.classId);

    const existing = await db.subclass.findUnique({
        where: { classId_name: { classId: input.classId, name: input.name } },
    });
    if (existing) throw new ConflictError(`Subclass '${input.name}' already exists in this class.`);

    return db.$transaction(async (tx) => {
        const sub = await tx.subclass.create({ data: input });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: cls.gameSystemId, after: sub });
        return sub;
    });
}

export async function updateSubclass(
    id: string,
    input: { name?: string; description?: string; source?: string; link?: string; isAvailable?: boolean; sortOrder?: number },
    actorId?: string,
) {
    const sub = await db.subclass.findUnique({ where: { id }, include: { class: true } });
    if (!sub) throw new NotFoundError('Subclass', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.subclass.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: sub.class.gameSystemId, before: sub, after: updated });
        return updated;
    });
}

export async function deleteSubclass(id: string, actorId?: string) {
    const sub = await db.subclass.findUnique({ where: { id }, include: { class: true } });
    if (!sub) throw new NotFoundError('Subclass', id);

    return db.$transaction(async (tx) => {
        await tx.subclass.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: sub.class.gameSystemId, before: sub });
    });
}