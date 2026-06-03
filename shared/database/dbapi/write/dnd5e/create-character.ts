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