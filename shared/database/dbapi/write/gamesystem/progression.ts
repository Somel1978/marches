// shared/database/dbapi/write/gamesystem/progression.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createProgressionThreshold(
    input: { gameSystemId: string; label: string; xpRequired: number; description?: string; sortOrder?: number },
    actorId?: string,
) {
    const gs = await db.gameSystem.findUnique({ where: { id: input.gameSystemId } });
    if (!gs) throw new NotFoundError('GameSystem', input.gameSystemId);

    const existing = await db.progressionThreshold.findUnique({
        where: { gameSystemId_label: { gameSystemId: input.gameSystemId, label: input.label } },
    });
    if (existing) throw new ConflictError(`Threshold '${input.label}' already exists in this game system.`);

    return db.$transaction(async (tx) => {
        const pt = await tx.progressionThreshold.create({ data: input });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: pt });
        return pt;
    });
}

export async function updateProgressionThreshold(
    id: string,
    input: { label?: string; xpRequired?: number; description?: string; sortOrder?: number },
    actorId?: string,
) {
    const pt = await db.progressionThreshold.findUnique({ where: { id } });
    if (!pt) throw new NotFoundError('ProgressionThreshold', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.progressionThreshold.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: pt.gameSystemId, before: pt, after: updated });
        return updated;
    });
}

export async function deleteProgressionThreshold(id: string, actorId?: string) {
    const pt = await db.progressionThreshold.findUnique({ where: { id } });
    if (!pt) throw new NotFoundError('ProgressionThreshold', id);

    return db.$transaction(async (tx) => {
        await tx.progressionThreshold.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: pt.gameSystemId, before: pt });
    });
}