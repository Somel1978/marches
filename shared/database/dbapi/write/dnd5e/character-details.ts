// shared/database/dbapi/write/dnd5e/character-details.ts
import { db } from '../../../index.ts';
import { NotFoundError } from '@core/errors';

// Save mood (emoji + text) on the universal Character record.
// Instant save — no approval workflow.
export async function saveCharacterMood(
    characterId: string,
    emoji:       string | null,
    text:        string | null,
) {
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);

    return db.character.update({
        where: { id: characterId },
        data:  {
            moodEmoji: emoji  ? emoji.trim().slice(0, 8)   : null,
            moodText:  text   ? text.trim().slice(0, 80)   : null,
        },
    });
}

export type CharacterDetailsInput = {
    alignment?:         string | null;
    personalityTraits?: string | null;
    ideals?:            string | null;
    bonds?:             string | null;
    flaws?:             string | null;
    appearance?:        string | null;
    age?:               number | null;
    height?:            string | null;
    weight?:            string | null;
};

// Save D&D 5e character details on the CharacterSheet.
// Does NOT trigger approval — these are flavour/roleplay fields.
export async function saveDnd5eCharacterDetails(
    characterId: string,
    input:       CharacterDetailsInput,
) {
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);

    return db.dnd5eCharacterSheet.upsert({
        where:  { characterId },
        create: { characterId, ...sanitiseDetails(input) },
        update: sanitiseDetails(input),
    });
}

function sanitiseDetails(input: CharacterDetailsInput) {
    return {
        alignment:         input.alignment         != null ? input.alignment.slice(0, 50)          : undefined,
        personalityTraits: input.personalityTraits != null ? input.personalityTraits.slice(0, 500) : undefined,
        ideals:            input.ideals            != null ? input.ideals.slice(0, 300)            : undefined,
        bonds:             input.bonds             != null ? input.bonds.slice(0, 300)             : undefined,
        flaws:             input.flaws             != null ? input.flaws.slice(0, 300)             : undefined,
        appearance:        input.appearance        != null ? input.appearance.slice(0, 500)        : undefined,
        age:               input.age               != null ? input.age                             : undefined,
        height:            input.height            != null ? input.height.slice(0, 50)             : undefined,
        weight:            input.weight            != null ? input.weight.slice(0, 50)             : undefined,
    };
}
