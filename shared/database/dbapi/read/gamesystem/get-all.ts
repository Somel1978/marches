// shared/database/dbapi/read/gamesystem/get-all.ts
import { db } from '../../../index.ts';

export async function getAllGameSystems() {
    return db.gameSystem.findMany({
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAvailableGameSystems() {
    return db.gameSystem.findMany({
        where:   { isAvailable: true },
        orderBy: { sortOrder: 'asc' },
    });
}
