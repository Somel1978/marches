// shared/database/dbapi/read/dnd5e/get-score-audit.ts
import { db } from '../../../index.ts';

export async function getScoreAuditForCharacter(characterId: string) {
    return db.dnd5eScoreAuditEntry.findMany({
        where:   { characterId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getScoreAuditForStat(characterId: string, stat: string) {
    return db.dnd5eScoreAuditEntry.findMany({
        where:   { characterId, stat: stat as any },
        orderBy: { createdAt: 'asc' },
    });
}
