// apps/frontend/src/routes/(protected)/characters/public/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import { characters, dnd5e, gameSystems } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const character = await characters.getPublicById(params.id);
	if (!character) throw error(404, 'Character not found');

	const gameSystem = await gameSystems.getById(character.gameSystemId);
	const systemSlug = (gameSystem as any)?.slug ?? '';

	// Load system-specific sheet data only if not private
	let charSheet  = null;
	let systemData = null;

	if (!character.isPrivate) {
		if (systemSlug === 'dnd5e') {
			[systemData, charSheet] = await Promise.all([
				dnd5e.getSystemData(character.gameSystemId),
				dnd5e.getCharacterSheet(params.id),
			]);
			// Add inventory from universal character model
			const inventory = await characters.getInventory(params.id);
			charSheet = { ...charSheet, inventory };
		}
		// Add more systems here as they are developed
	}

	console.log('[public-char] id:', params.id, 'slug:', systemSlug, 'private:', character.isPrivate);
	if (charSheet) {
		const scores = (charSheet as any).abilityScores ?? [];
		console.log('[public-char] abilityScores:', JSON.stringify(scores));
	}
	console.log('[public-char] id:', params.id, 'slug:', systemSlug, 'private:', character.isPrivate);
	if (charSheet) {
		const scores = (charSheet as any).abilityScores ?? [];
		console.log('[public-char] abilityScores count:', scores.length);
		console.log('[public-char] abilityScores:', JSON.stringify(scores));
	}
	return { character, charSheet, systemData, systemSlug };
};