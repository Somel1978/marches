// shared/database/dbapi/write/characters/update.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

// Universal free fields — save immediately, no approval needed, any system
export async function updateCharacterFreeFields(
    id: string,
    input: {
        name?:        string;
        avatarUrl?:   string | null;
        portraitUrl?: string | null;
        description?: string | null;
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
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Character', resourceId: id, before: character, after: updated });
        return updated;
    });
}

// Universal admin update — universal fields only (name, avatar, worldId, level etc)
// For system-specific fields (species, background, classes) use the system's own update function
export async function updateCharacter(
    id: string,
    input: {
        name?:         string;
        avatarUrl?:    string | null;
        portraitUrl?:  string | null;
        description?:  string | null;
        worldId?:      string | null;
        isGlobal?:     boolean;
        gameSystemId?: string;
        level?:        number;
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
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Character', resourceId: id, before: character, after: updated });
        return updated;
    });
}