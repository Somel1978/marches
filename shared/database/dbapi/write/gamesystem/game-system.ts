// shared/database/dbapi/write/gamesystem/game-system.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createGameSystem(
    input: { name: string; description?: string; sortOrder?: number },
    actorId?: string,
) {
    const existing = await db.gameSystem.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`GameSystem with name '${input.name}' already exists.`);

    return db.$transaction(async (tx) => {
        const gs = await tx.gameSystem.create({ data: input });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: gs.id, after: gs });
        return gs;
    });
}

export async function updateGameSystem(
    id: string,
    input: { name?: string; description?: string; isAvailable?: boolean; sortOrder?: number },
    actorId?: string,
) {
    const gs = await db.gameSystem.findUnique({ where: { id } });
    if (!gs) throw new NotFoundError('GameSystem', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.gameSystem.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: id, before: gs, after: updated });
        return updated;
    });
}

export async function deleteGameSystem(id: string, actorId?: string) {
    const gs = await db.gameSystem.findUnique({ where: { id } });
    if (!gs) throw new NotFoundError('GameSystem', id);

    return db.$transaction(async (tx) => {
        await tx.gameSystem.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: id, before: gs });
    });
}