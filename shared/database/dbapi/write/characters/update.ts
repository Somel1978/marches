// shared/database/dbapi/write/characters/update.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function updateCharacter(
    id: string,
    input: {
        name?:        string;
        speciesId?:   string | null;
        avatarUrl?:   string;
        portraitUrl?: string;
        gameSystemId?: string;
        description?: string | null;
        worldId?:     string | null;
        isGlobal?:    boolean;
    },
    actorId?: string,
) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    if (input.name && input.name !== character.name) {
        const existing = await db.character.findUnique({ where: { name: input.name } });
        if (existing) throw new ConflictError(`Character name '${input.name}' is already taken.`);
    }

    return db.$transaction(async (tx) => {
        const updated = await tx.character.update({ where: { id }, data: input });
        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      character,
            after:       updated,
        });
        return updated;
    });
}