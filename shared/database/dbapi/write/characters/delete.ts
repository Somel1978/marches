// shared/database/dbapi/write/characters/delete.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function deleteCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    return db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      character,
        });
        await tx.character.delete({ where: { id } });
    });
}
