// shared/database/dbapi/read/gamesystem/get-by-id.ts
import { db } from '../../../index.ts';

export async function getGameSystemById(id: string) {
    return db.gameSystem.findUnique({
        where:   { id },
        include: {
            progressionThresholds: { orderBy: { xpRequired: 'asc' } },
        },
    });
}