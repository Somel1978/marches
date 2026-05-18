// shared/database/dbapi/write/gamesystem/class.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createClass(
    input: { gameSystemId: string; name: string; description?: string; source?: string; link?: string; sortOrder?: number },
    actorId?: string,
) {
    const gs = await db.gameSystem.findUnique({ where: { id: input.gameSystemId } });
    if (!gs) throw new NotFoundError('GameSystem', input.gameSystemId);

    const existing = await db.class.findUnique({
        where: { gameSystemId_name: { gameSystemId: input.gameSystemId, name: input.name } },
    });
    if (existing) throw new ConflictError(`Class '${input.name}' already exists in this game system.`);

    return db.$transaction(async (tx) => {
        const cls = await tx.class.create({ data: input });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: cls });
        return cls;
    });
}

export async function updateClass(
    id: string,
    input: { name?: string; description?: string; source?: string; link?: string; isAvailable?: boolean; sortOrder?: number },
    actorId?: string,
) {
    const cls = await db.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundError('Class', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.class.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: cls.gameSystemId, before: cls, after: updated });
        return updated;
    });
}

export async function deleteClass(id: string, actorId?: string) {
    const cls = await db.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundError('Class', id);

    return db.$transaction(async (tx) => {
        await tx.class.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: cls.gameSystemId, before: cls });
    });
}