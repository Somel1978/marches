// shared/database/dbapi/write/dnd5e/create-character.ts
import { db } from '../../../index.ts';
import { ValidationError } from '@core/errors';
import { createCharacter } from '../characters/create.ts';
import { getEffectiveThresholds, resolveProgressionMode } from '../characters/progression.ts';

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

    // The character snapshots its progression mode at creation: world override
    // first, then the game system default. It stays fixed for the character's life
    // so a global character behaves consistently across every world it visits.
    const progressionMode = await resolveProgressionMode(db, input.gameSystemId, input.worldId);

    // Seed the running total to the minimum needed for this level. Without it a
    // character created above level 1 would sit at 0 and immediately read as a
    // level-down. Which column we seed depends on the mode.
    let startingXp         = 0;
    let startingMilestones = 0;
    if (initialLevel > 0) {
        // Home-world sparse overrides apply at create so starting totals match
        // the ladder the character will actually level against.
        const thresholds = await getEffectiveThresholds(db, input.gameSystemId, input.worldId);
        // Level = number of thresholds cleared, so being at initialLevel means
        // clearing the Nth threshold (0-indexed: initialLevel - 1).
        if (thresholds.length >= initialLevel) {
            const t = thresholds[initialLevel - 1];
            if (progressionMode === 'MILESTONE') startingMilestones = t.milestoneRequired;
            else                                 startingXp         = t.xpRequired;
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
        level:           initialLevel,
        progressionMode,
        totalXp:         startingXp,
        totalMilestones: startingMilestones,
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