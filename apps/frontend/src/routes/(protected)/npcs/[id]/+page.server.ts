// apps/frontend/src/routes/(protected)/npcs/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import { factions } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const npc = await factions.npcs.getById(params.id);
	if (!npc || !npc.isVisible || !npc.world?.isActive) throw error(404, 'NPC not found');

	// Player-safe object — DM-only fields stripped: statBlock, mannerisms,
	// ideals/bonds/flaws, motivation, secrets, renownThreshold.
	const safeNpc = {
		id:          npc.id,
		name:        npc.name,
		aliases:     npc.aliases,
		imageUrl:    npc.imageUrl,
		status:      npc.status,
		services:    npc.services,
		bounties:    npc.bounties,
		world:       npc.world,
		faction:     npc.faction?.isVisible
			? { id: npc.faction.id, name: npc.faction.name, slug: npc.faction.slug }
			: null,
		rank:        npc.faction?.isVisible ? npc.rank : null,
		factionRole: npc.faction?.isVisible ? npc.factionRole : null,
		location:    npc.location,
	};

	return { npc: safeNpc };
};
