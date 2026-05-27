// shared/database/dbapi/write/characters/update.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';
import type { ClassAllocationInput } from './create.ts';

// Free fields — save immediately, no approval needed
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

// Structural fields — save to pendingChanges, move to PENDING_APPROVAL
export async function submitStructuralChanges(
    id: string,
    input: {
        speciesId?:    string;
        backgroundId?: string;
        classes?:      ClassAllocationInput[];
        worldId?:      string | null;
        isGlobal?:     boolean;
    },
    actorId?: string,
) {
    const character = await db.character.findUnique({ where: { id }, include: { classes: true } });
    if (!character) throw new NotFoundError('Character', id);

    const pendingChanges = {
        speciesId:    input.speciesId    ?? character.speciesId,
        backgroundId: input.backgroundId ?? (character as any).backgroundId,
        classes:      input.classes      ?? character.classes.map(c => ({ classId: c.classId, subclassId: c.subclassId, allocatedLevel: c.allocatedLevel })),
        worldId:      input.worldId      !== undefined ? input.worldId  : character.worldId,
        isGlobal:     input.isGlobal     !== undefined ? input.isGlobal : character.isGlobal,
        submittedAt:  new Date().toISOString(),
    };

    return db.$transaction(async (tx) => {
        const updated = await tx.character.update({
            where: { id },
            data:  {
                pendingChanges: pendingChanges as any,
                status:         'PENDING',
                statusReason:   'EDIT_PENDING',
                statusChangedAt: new Date(),
            },
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Character', resourceId: id, before: character, after: updated });
        return updated;
    });
}

// Admin-only: update any field directly (bypasses approval)
export async function updateCharacter(
    id: string,
    input: {
        name?:         string;
        speciesId?:    string | null;
        backgroundId?: string | null;
        avatarUrl?:    string | null;
        portraitUrl?:  string | null;
        description?:  string | null;
        worldId?:      string | null;
        isGlobal?:     boolean;
        gameSystemId?: string;
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