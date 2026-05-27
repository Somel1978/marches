// shared/database/dbapi/read/gamesystem/get-all.ts
import { db } from '../../../index.ts';

export async function getAllGameSystems() {
    return db.gameSystem.findMany({
        include: { progressionThresholds: { orderBy: { xpRequired: 'asc' } } },
        orderBy: { name: 'asc' },
    });
}

export async function getActiveGameSystems() {
    return db.gameSystem.findMany({
        where:   { isActive: true },
        include: { progressionThresholds: { orderBy: { xpRequired: 'asc' } } },
        orderBy: { name: 'asc' },
    });
}