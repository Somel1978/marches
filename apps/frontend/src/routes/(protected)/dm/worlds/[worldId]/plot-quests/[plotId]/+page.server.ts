// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/plot-quests/[plotId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { worlds, factions, db } from '@core/database';
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

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage, world } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const [plot, linkableQuests, worldFactions, worldNpcs, calendar] = await Promise.all([
		worlds.plotQuests.getById(params.plotId),
		worlds.plotQuests.listLinkableQuests(params.worldId),
		factions.getByWorld(params.worldId),
		factions.npcs.getByWorld(params.worldId),
		worlds.calendar.ensure(params.worldId),
	]);
	if (!plot || plot.worldId !== params.worldId) throw error(404, 'Plot quest not found');

	return { world, canManage, plot, linkableQuests, worldFactions, worldNpcs, calendar };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			const deadlineRaw = data.get('deadlineDay')?.toString().trim();
			await worlds.plotQuests.update(params.plotId, {
				title: data.get('title')?.toString() ?? '',
				summary: data.get('summary')?.toString() ?? null,
				description: data.get('description')?.toString() ?? null,
				status: data.get('status')?.toString(),
				deadlineDay: deadlineRaw === '' || deadlineRaw == null ? null : Number(deadlineRaw),
				sortOrder: Number(data.get('sortOrder') ?? 0),
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
			await worlds.plotQuests.delete(params.plotId, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/dm/worlds/${params.worldId}/plot-quests`);
	},

	linkQuest: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const questId = (await request.formData()).get('questId')?.toString() ?? '';
		if (!questId) return fail(400, { message: 'Quest required.' });
		try {
			await worlds.plotQuests.linkQuest(params.plotId, questId, locals.user!.id);
			return { linkSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	unlinkQuest: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const linkId = (await request.formData()).get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Link required.' });
		try {
			await worlds.plotQuests.unlinkQuest(linkId, locals.user!.id);
			return { linkSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	linkFaction: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const factionId = (await request.formData()).get('factionId')?.toString() ?? '';
		if (!factionId) return fail(400, { message: 'Faction required.' });
		try {
			await factions.questLinks.add(factionId, params.plotId, locals.user!.id);
			return { factionSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	unlinkFaction: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const linkId = (await request.formData()).get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Link required.' });
		try {
			await factions.questLinks.remove(linkId, locals.user!.id);
			return { factionSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	linkNpc: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const npcId = (await request.formData()).get('npcId')?.toString() ?? '';
		if (!npcId) return fail(400, { message: 'NPC required.' });
		try {
			await factions.npcs.questLinks.add(npcId, params.plotId, locals.user!.id);
			return { npcSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	unlinkNpc: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const linkId = (await request.formData()).get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Link required.' });
		try {
			await factions.npcs.questLinks.remove(linkId, locals.user!.id);
			return { npcSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
