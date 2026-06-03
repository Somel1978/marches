// shared/database/dbapi/read/dnd5e/get-feats.ts
import { db } from '../../../index.ts';

export async function getDnd5eFeats(gameSystemId: string) {
    return db.dnd5eFeat.findMany({
        where:   { gameSystemId, isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
}

export async function getAllDnd5eFeats(gameSystemId: string) {
    return db.dnd5eFeat.findMany({
        where:   { gameSystemId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
}

export async function getDnd5eFeatById(id: string) {
    return db.dnd5eFeat.findUnique({ where: { id } });
}
