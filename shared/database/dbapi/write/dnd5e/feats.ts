// shared/database/dbapi/write/dnd5e/feats.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function createDnd5eFeat(input: {
    gameSystemId:  string;
    name:          string;
    description?:  string;
    snippet?:      string;
    repeatable?:   boolean;
    categories?:   string;
    prerequisites?: string;
    detailsUrl?:   string;
    isAvailable?:  boolean;
    isEpicBoon?:   boolean;
    sortOrder?:    number;
}, actorId?: string) {
    return db.$transaction(async (tx) => {
        const feat = await tx.dnd5eFeat.create({ data: { ...input } });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Dnd5eFeat', resourceId: feat.id, after: feat });
        return feat;
    });
}

export async function updateDnd5eFeat(id: string, input: {
    name?:          string;
    description?:   string;
    snippet?:       string;
    repeatable?:    boolean;
    categories?:    string;
    prerequisites?: string;
    detailsUrl?:    string;
    isAvailable?:   boolean;
    isEpicBoon?:    boolean;
    sortOrder?:     number;
}, actorId?: string) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', id);
    return db.$transaction(async (tx) => {
        const updated = await tx.dnd5eFeat.update({ where: { id }, data: input });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Dnd5eFeat', resourceId: id, before: feat, after: updated });
        return updated;
    });
}

export async function deleteDnd5eFeat(id: string, actorId?: string) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', id);
    return db.$transaction(async (tx) => {
        await tx.dnd5eFeat.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Dnd5eFeat', resourceId: id, before: feat });
    });
}
