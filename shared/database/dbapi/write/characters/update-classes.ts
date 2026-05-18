// shared/database/dbapi/write/characters/update-classes.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export type ClassAllocation = {
    classId:       string;
    subclassId?:   string | null;
    allocatedLevel: number;
};

export async function updateCharacterClasses(
    characterId: string,
    classes: ClassAllocation[],
    actorId?: string,
) {
    const char = await db.character.findUnique({ where: { id: characterId } });
    if (!char) throw new NotFoundError('Character', characterId);

    const totalAllocated = classes.reduce((sum, c) => sum + c.allocatedLevel, 0);
    if (totalAllocated < 1) throw new ValidationError('Must allocate at least 1 level.');

    return db.$transaction(async (tx) => {
        const before = await tx.characterClass.findMany({ where: { characterId } });

        // Replace all class allocations
        await tx.characterClass.deleteMany({ where: { characterId } });
        await tx.characterClass.createMany({
            data: classes.map(c => ({
                characterId,
                classId:        c.classId,
                subclassId:     c.subclassId ?? null,
                allocatedLevel: c.allocatedLevel,
            })),
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  characterId,
            before:      before,
            after:       classes,
        });
    });
}