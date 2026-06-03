// apps/frontend/src/routes/(protected)/characters/[id]/_loaders/dnd5e.server.ts
// Loads all dnd5e-specific data for a character page. Called conditionally by +page.server.ts
// when gameSystem.slug === 'dnd5e'. Zero universal layer knowledge here.
import { dnd5e } from '@core/database';

export async function loadDnd5eCharacterData(characterId: string, gameSystemId: string) {
    const [systemData, charSheet] = await Promise.all([
        dnd5e.getSystemData(gameSystemId),   // classes+features+subclasses, species+traits, backgrounds, feats
        dnd5e.getCharacterSheet(characterId), // enriched sheet, ASI slots, chosen feats, ability scores
    ]);
    return { systemData, charSheet };
}