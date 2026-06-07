// shared/database/dbapi/write/dnd5e/create-character.ts
import { db } from '../../../index.ts';
import { ValidationError } from '@core/errors';
import { createCharacter } from '../characters/create.ts';

export type ClassAllocationInput = {
    classId:        string;
    subclassId?:    string | null;
    allocatedLevel: number;
};

export type Dnd5eCreateCharacterInput = {
    userId:        string;
    gameSystemId:  string;
    name:          string;
    speciesId:     string;
    backgroundId:  string;
    classes:       ClassAllocationInput[];
    avatarUrl?:    string;
    portraitUrl?:  string;
    description?:  string;
    worldId?:      string;
    isGlobal?:     boolean;
};

export async function createDnd5eCharacter(
    input: Dnd5eCreateCharacterInput,
    actorId?: string,
) {
    // dnd5e-specific validation
    if (!input.speciesId)      throw new ValidationError('Species is required.');
    if (!input.backgroundId)   throw new ValidationError('Background is required.');
    if (!input.classes?.length) throw new ValidationError('At least one class is required.');

    const initialLevel = input.classes.reduce((s, c) => s + c.allocatedLevel, 0);

    // Find the minimum XP required to be at this level from progression thresholds.
    // Without this, a character created above level 1 would have 0 XP, breaking
    // level-up detection and all XP-dependent logic.
    let startingXp = 0;
    if (initialLevel > 0) {
        const thresholds = await db.progressionThreshold.findMany({
            where:   { gameSystemId: input.gameSystemId },
            orderBy: { xpRequired: 'asc' },
            select:  { xpRequired: true },
        });
        // Level = number of thresholds cleared (same logic as level-check.ts).
        // To be at initialLevel, the character must have cleared initialLevel thresholds.
        // Minimum XP = xpRequired of the Nth threshold (0-indexed: initialLevel - 1).
        if (initialLevel > 0 && thresholds.length >= initialLevel) {
            startingXp = thresholds[initialLevel - 1].xpRequired;
        }
    }

    // Create the universal character first
    const character = await createCharacter({
        userId:       input.userId,
        gameSystemId: input.gameSystemId,
        name:         input.name,
        avatarUrl:    input.avatarUrl,
        portraitUrl:  input.portraitUrl,
        description:  input.description,
        worldId:      input.worldId,
        isGlobal:     input.isGlobal,
        level:        initialLevel,
        totalXp:      startingXp,
    }, actorId);

    // Create dnd5e-specific data
    await db.$transaction(async (tx) => {
        await tx.dnd5eCharacterSheet.create({
            data: {
                characterId:  character.id,
                speciesId:    input.speciesId,
                backgroundId: input.backgroundId,
            },
        });

        await tx.dnd5eCharacterClass.createMany({
            data: input.classes.map(c => ({
                characterId:    character.id,
                classId:        c.classId,
                subclassId:     c.subclassId ?? null,
                allocatedLevel: c.allocatedLevel,
            })),
        });
    });

    return character;
}