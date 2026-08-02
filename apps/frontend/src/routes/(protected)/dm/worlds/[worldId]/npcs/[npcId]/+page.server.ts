// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/npcs/[npcId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { factions, worlds, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

function str(data: FormData, key: string): string | null {
	const v = data.get(key)?.toString().trim();
	return v ? v : null;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	// Any assigned DM may view (NPC sheets are DM material); mutations gated by canManage.
	const { world, canManage } = await parent();

	const [npc, factionList, worldPlotQuests] = await Promise.all([
		factions.npcs.getById(params.npcId),
		factions.getByWorld(params.worldId),
		worlds.plotQuests.listByWorld(params.worldId),
	]);
	if (!npc || npc.worldId !== params.worldId) throw error(404, 'NPC not found');

	// Ranks of the NPC's current faction for the rank selector
	const factionDetail = npc.factionId ? await factions.getById(npc.factionId) : null;

	return {
		world,
		canManage,
		npc,
		factions:     factionList,
		factionRanks: factionDetail?.ranks ?? [],
		worldPlotQuests,
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
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
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await factions.npcs.delete(params.npcId, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/dm/worlds/${params.worldId}/npcs`);
	},

	addQuest: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const plotQuestId = data.get('plotQuestId')?.toString() ?? '';
		if (!plotQuestId) return fail(400, { message: 'Plot quest required.' });
		try {
			await factions.npcs.questLinks.add(params.npcId, plotQuestId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeQuest: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const linkId = data.get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Plot quest link required.' });
		try {
			await factions.npcs.questLinks.remove(linkId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
