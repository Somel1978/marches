// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_loaders/dnd5e.server.ts
import { dnd5e } from '@core/database';

export async function loadDnd5eCharacterData(characterId: string, gameSystemId: string) {
	const [systemData, charSheet, scoreAudit] = await Promise.all([
		dnd5e.getSystemData(gameSystemId),
		dnd5e.getCharacterSheet(characterId),
		dnd5e.getScoreAudit(characterId),
	]);
	return { systemData, charSheet, scoreAudit };
}