// shared/database/dbapi/write/gamesystem/species.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createSpecies(
    input: { gameSystemId: string; name: string; description?: string; source?: string; link?: string; sortOrder?: number },
    actorId?: string,
) {
    const gs = await db.gameSystem.findUnique({ where: { id: input.gameSystemId } });
    if (!gs) throw new NotFoundError('GameSystem', input.gameSystemId);

    const existing = await db.species.findUnique({
        where: { gameSystemId_name: { gameSystemId: input.gameSystemId, name: input.name } },
    });
    if (existing) throw new ConflictError(`Species '${input.name}' already exists in this game system.`);

    return db.$transaction(async (tx) => {
        const species = await tx.species.create({ data: input });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: species });
        return species;
    });
}

export async function updateSpecies(
    id: string,
    input: { name?: string; description?: string; source?: string; link?: string; isAvailable?: boolean; sortOrder?: number },
    actorId?: string,
) {
    const species = await db.species.findUnique({ where: { id } });
    if (!species) throw new NotFoundError('Species', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.species.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: species.gameSystemId, before: species, after: updated });
        return updated;
    });
}

export async function deleteSpecies(id: string, actorId?: string) {
    const species = await db.species.findUnique({ where: { id } });
    if (!species) throw new NotFoundError('Species', id);

    return db.$transaction(async (tx) => {
        await tx.species.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: species.gameSystemId, before: species });
    });
}
