// shared/database/dbapi/read/characters/get-transactions.ts
import { db } from '../../../index.ts';

export async function getCharacterTransactions(characterId: string, limit = 50) {
    return db.characterTransaction.findMany({
        where:   { characterId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    });
}
