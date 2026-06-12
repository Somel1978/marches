// apps/admin/src/routes/(app)/world/[id]/npcs/[npcId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { factions, worlds, quests } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

function str(data: FormData, key: string): string | null {
	const v = data.get(key)?.toString().trim();
	return v ? v : null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const [world, npc, factionList, worldQuests] = await Promise.all([
		worlds.getById(params.id),
		factions.npcs.getById(params.npcId),
		factions.getByWorld(params.id),
		quests.getAll({ worldId: params.id, perPage: 200 }),
	]);
	if (!world) throw error(404, 'World not found');
	if (!npc || npc.worldId !== params.id) throw error(404, 'NPC not found');

	// Ranks of the NPC's current faction for the rank selector
	const factionDetail = npc.factionId ? await factions.getById(npc.factionId) : null;

	return {
		world,
		npc,
		factions:     factionList,
		factionRanks: factionDetail?.ranks ?? [],
		worldQuests:  (worldQuests as any).items ?? [],
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const renownThreshold = data.get('renownThreshold')?.toString().trim();
		try {
			await factions.npcs.update(params.npcId, {
				name:            data.get('name')?.toString().trim() || undefined,
				aliases:         str(data, 'aliases'),
				imageUrl:        str(data, 'imageUrl'),
				locationId:      str(data, 'locationId'),
				factionId:       str(data, 'factionId'),
				rankId:          str(data, 'rankId'),
				factionRole:     str(data, 'factionRole'),
				renownThreshold: renownThreshold ? Number(renownThreshold) : null,
				statBlock:       str(data, 'statBlock'),
				mannerisms:      str(data, 'mannerisms'),
				ideals:          str(data, 'ideals'),
				bonds:           str(data, 'bonds'),
				flaws:           str(data, 'flaws'),
				motivation:      str(data, 'motivation'),
				services:        str(data, 'services'),
				secrets:         str(data, 'secrets'),
				bounties:        str(data, 'bounties'),
				status:          data.get('status')?.toString() || undefined,
				isVisible:       data.get('isVisible') === 'true',
			}, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await factions.npcs.delete(params.npcId, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/world/${params.id}/npcs`);
	},

	addQuest: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const questId = data.get('questId')?.toString() ?? '';
		if (!questId) return fail(400, { message: 'Quest required.' });
		try {
			await factions.npcs.questLinks.add(params.npcId, questId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeQuest: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const linkId = data.get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Quest link required.' });
		try {
			await factions.npcs.questLinks.remove(linkId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
