// shared/database/dbapi/write/dnd5e/update-character.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';
import { syncBackgroundFeatGrant } from './background-feat-grant.ts';
import { syncSpeciesTraitGrants } from './species-trait-grants.ts';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';
import type { ClassAllocationInput } from './create-character.ts';

// Submit structural changes for dnd5e characters (species, background, classes)
// Stores pendingChanges on Dnd5eCharacterSheet and moves character to PENDING
export async function submitDnd5eStructuralChanges(
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
    const character = await db.character.findUnique({ where: { id }, include: { classes: true, dnd5eSheet: true } });
    if (!character) throw new NotFoundError('Character', id);

    const sheet = (character as any).dnd5eSheet;
    const pendingChanges = {
        speciesId:    input.speciesId    ?? sheet?.speciesId    ?? null,
        backgroundId: input.backgroundId ?? sheet?.backgroundId ?? null,
        classes:      input.classes      ?? character.classes.map((c: any) => ({ classId: c.classId, subclassId: c.subclassId, allocatedLevel: c.allocatedLevel })),
        worldId:      input.worldId      !== undefined ? input.worldId  : character.worldId,
        isGlobal:     input.isGlobal     !== undefined ? input.isGlobal : character.isGlobal,
        submittedAt:  new Date().toISOString(),
    };

    return db.$transaction(async (tx) => {
        await tx.dnd5eCharacterSheet.upsert({
            where:  { characterId: id },
            create: { characterId: id, speciesId: sheet?.speciesId ?? null, backgroundId: sheet?.backgroundId ?? null, pendingChanges: pendingChanges as any },
            update: { pendingChanges: pendingChanges as any },
        });

        const updated = await tx.character.update({
            where: { id },
            data:  { status: 'PENDING', statusReason: 'EDIT_PENDING', statusChangedAt: new Date() },
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Character', resourceId: id, before: character, after: updated });
        return updated;
    });
}

// Admin-only: update dnd5e-specific fields directly (bypasses approval)
export async function updateDnd5eCharacterFields(
    id: string,
    input: {
        speciesId?:    string | null;
        backgroundId?: string | null;
        size?:         string | null;
    },
    actorId?: string,
) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    const sheet = await db.dnd5eCharacterSheet.findUnique({ where: { characterId: id }, select: { speciesId: true, backgroundId: true } });

    await db.$transaction(async (tx) => {
        await tx.dnd5eCharacterSheet.upsert({
            where:  { characterId: id },
            create: { characterId: id, speciesId: input.speciesId ?? null, backgroundId: input.backgroundId ?? null, size: input.size ?? null },
            update: {
                ...(input.speciesId    !== undefined && { speciesId:    input.speciesId    }),
                ...(input.backgroundId !== undefined && { backgroundId: input.backgroundId }),
                ...(input.size         !== undefined && { size:         input.size         }),
            },
        });
        // Sync auto-granted background feat when background changes
        if (input.backgroundId !== undefined) {
            await syncBackgroundFeatGrant(tx, id, input.backgroundId, sheet?.backgroundId ?? null);
        }
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Character', resourceId: id, before: character, after: input });
    });

    // Keep species-trait-sourced fixed grants in sync when species changes.
    // Runs outside the transaction (uses its own internal batched deletes/creates).
    if (input.speciesId !== undefined) {
        await syncSpeciesTraitGrants(id, character.gameSystemId, character.level, input.speciesId, sheet?.speciesId ?? null);
    }
}