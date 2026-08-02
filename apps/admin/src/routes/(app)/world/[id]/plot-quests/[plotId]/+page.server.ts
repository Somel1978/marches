// apps/admin/src/routes/(app)/world/[id]/plot-quests/[plotId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { worlds, factions } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

function canUpdate(locals: App.Locals) {
	return checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' }).allowed;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');

	const [plot, linkableQuests, worldFactions, worldNpcs, calendar] = await Promise.all([
		worlds.plotQuests.getById(params.plotId),
		worlds.plotQuests.listLinkableQuests(params.id),
		factions.getByWorld(params.id),
		factions.npcs.getByWorld(params.id),
		worlds.calendar.ensure(params.id),
	]);
	if (!plot || plot.worldId !== params.id) throw error(404, 'Plot quest not found');

	return {
		world,
		canEdit: canUpdate(locals),
		plot,
		linkableQuests,
		worldFactions,
		worldNpcs,
		calendar,
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
		try {
			await worlds.plotQuests.delete(params.plotId, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/world/${params.id}/plot-quests`);
	},

	linkQuest: async ({ params, request, locals }) => {
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
		if (!canUpdate(locals)) return fail(403, { message: 'Forbidden' });
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
