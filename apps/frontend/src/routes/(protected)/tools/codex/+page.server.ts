// apps/frontend/src/routes/(protected)/tools/codex/+page.server.ts
import { error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'dnd5eDescriptions', action: 'read' });
	if (!can.allowed) throw error(403, 'You do not have permission to view the D&D 5e Codex.');

	const systems = await gameSystems.getActive();
	const gs = systems.find(s => s.slug === 'dnd5e');
	if (!gs) throw error(404, 'D&D 5e game system not found');

	const codex = await dnd5e.getCodexData(gs.id);
	return {
		gameSystem: { id: gs.id, name: gs.name, slug: gs.slug },
		codex,
	};
};
