// shared/database/dbapi/write/dnd5e/update-classes.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { reconcileProgression } from '../characters/progression.ts';

export type ClassAllocation = {
    classId:       string;
    subclassId?:   string | null;
    allocatedLevel: number;
};

export async function updateDnd5eCharacterClasses(
    characterId: string,
    classes: ClassAllocation[],
    actorId?: string,
) {
    const char = await db.character.findUnique({ where: { id: characterId } });
    if (!char) throw new NotFoundError('Character', characterId);

    const totalAllocated = classes.reduce((sum, c) => sum + c.allocatedLevel, 0);
    if (totalAllocated < 1) throw new ValidationError('Must allocate at least 1 level.');

    return db.$transaction(async (tx) => {
        const before = await tx.dnd5eCharacterClass.findMany({ where: { characterId } });

        await tx.dnd5eCharacterClass.deleteMany({ where: { characterId } });
        await tx.dnd5eCharacterClass.createMany({
            data: classes.map(c => ({
                characterId,
                classId:        c.classId,
                subclassId:     c.subclassId ?? null,
                allocatedLevel: c.allocatedLevel,
            })),
        });

        // Approved level always mirrors the allocation.
        await tx.character.update({
            where: { id: characterId },
            data:  { level: totalAllocated },
        });
        // Re-evaluate against the progression totals so the character is not left
        // silently over- or under-allocated after a direct admin edit.
        await reconcileProgression(tx, characterId, { actorId: actorId ?? 'system' });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  characterId,
            before,
            after:       classes,
        });
    });
}