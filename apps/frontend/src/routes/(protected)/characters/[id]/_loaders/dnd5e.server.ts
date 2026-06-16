// apps/frontend/src/routes/(protected)/characters/[id]/_loaders/dnd5e.server.ts
// Loads all dnd5e-specific data for a character page. Called conditionally by +page.server.ts
// when gameSystem.slug === 'dnd5e'. Zero universal layer knowledge here.
import { dnd5e } from '@core/database';

export async function loadDnd5eCharacterData(characterId: string, gameSystemId: string) {
    const [systemData, charSheet, scoreAudit, spellbooks] = await Promise.all([
        dnd5e.getSystemData(gameSystemId),
        dnd5e.getCharacterSheet(characterId),
        dnd5e.getScoreAudit(characterId),
        dnd5e.spellbooks.getForCharacter(characterId),
    ]);
    return { systemData, charSheet, scoreAudit, spellbooks };
}