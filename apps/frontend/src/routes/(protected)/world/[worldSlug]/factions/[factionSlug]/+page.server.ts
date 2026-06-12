// apps/frontend/src/routes/(protected)/world/[worldSlug]/factions/[factionSlug]/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds, factions, characters } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	const faction = await factions.getBySlug(world.id, params.factionSlug);
	if (!faction || !faction.isVisible) throw error(404, 'Faction not found');

	// Player's own characters → own renown only (no row = neutral 0)
	const myCharacters = await characters.getByUserId(locals.user!.id);
	const renownByChar = Object.fromEntries(
		(faction.renown as any[]).map((r: any) => [r.characterId, r.value]),
	);
	const myRenown = (myCharacters as any[]).map((c: any) => ({
		characterId: c.id,
		name:        c.name,
		value:       renownByChar[c.id] ?? 0,
	}));

	// Player-safe object — STRIP: secrets, full renown list, hidden related factions/NPCs.
	const safeFaction = {
		id:             faction.id,
		name:           faction.name,
		slug:           faction.slug,
		designation:    faction.designation,
		heraldryUrl:    faction.heraldryUrl,
		primaryColors:  faction.primaryColors,
		motto:          faction.motto,
		powerTier:      faction.powerTier,
		lore:           faction.lore,
		ideals:         faction.ideals,
		taboos:         faction.taboos,
		inductionHooks: faction.inductionHooks,
		bounties:       faction.bounties,
		ranks:          faction.ranks,
		territories:    faction.territories,
		relations:      (faction.relations as any[]).filter((r: any) => r.other?.isVisible),
		npcs:           faction.npcs, // getBySlug already filters isVisible NPCs
		quests:         (faction.quests as any[]).filter((q: any) => q.quest),
	};

	return { world, faction: safeFaction, myRenown };
};
