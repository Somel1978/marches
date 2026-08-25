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

	const [plot, linkableQuests, worldFactions, worldNpcs, calendar, progression] = await Promise.all([
		worlds.plotQuests.getById(params.plotId),
		worlds.plotQuests.listLinkableQuests(params.worldId),
		factions.getByWorld(params.worldId),
		factions.npcs.getByWorld(params.worldId),
		worlds.calendar.ensure(params.worldId),
		worlds.plotQuests.getProgression(params.plotId),
	]);
	if (!plot || plot.worldId !== params.worldId) throw error(404, 'Plot quest not found');

	return { world, canManage, plot, linkableQuests, worldFactions, worldNpcs, calendar, progression };
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

	createNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const failRaw = data.get('failureTimeoutDay')?.toString().trim();
		try {
			await worlds.plotQuests.createNode(params.plotId, {
				kind: data.get('kind')?.toString() ?? '',
				title: data.get('title')?.toString() ?? '',
				description: data.has('description') ? data.get('description')?.toString() ?? null : undefined,
				parentNodeId: data.get('parentNodeId')?.toString() || null,
				objectiveTier: data.get('objectiveTier')?.toString() || null,
				encounterKind: data.get('encounterKind')?.toString() || null,
				socialFactionId: data.has('socialFactionId') ? data.get('socialFactionId')?.toString() ?? null : undefined,
				socialNpcId: data.has('socialNpcId') ? data.get('socialNpcId')?.toString() ?? null : undefined,
				failureTimeoutDay: failRaw === '' || failRaw == null ? null : Number(failRaw),
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		const failRaw = data.has('failureTimeoutDay') ? data.get('failureTimeoutDay')?.toString().trim() : undefined;
		try {
			await worlds.plotQuests.updateNode(nodeId, {
				title: data.get('title')?.toString(),
				summary: data.has('summary') ? data.get('summary')?.toString() ?? null : undefined,
				description: data.has('description') ? data.get('description')?.toString() ?? null : undefined,
				objectiveTier: data.get('objectiveTier')?.toString(),
				encounterKind: data.has('encounterKind') ? data.get('encounterKind')?.toString() ?? null : undefined,
				socialFactionId: data.has('socialFactionId') ? data.get('socialFactionId')?.toString() ?? null : undefined,
				socialNpcId: data.has('socialNpcId') ? data.get('socialNpcId')?.toString() ?? null : undefined,
				failureTimeoutDay: failRaw === undefined ? undefined : (failRaw === '' || failRaw == null ? null : Number(failRaw)),
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const nodeId = (await request.formData()).get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.plotQuests.deleteNode(nodeId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	setNodeState: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		const status = data.get('status')?.toString() ?? '';
		if (!nodeId || !status) return fail(400, { message: 'nodeId and status required' });
		try {
			const notes = data.has('note') || data.has('playerNote') || data.has('playerNoteVisible')
				? {
					note: data.has('note') ? data.get('note')?.toString() ?? null : undefined,
					playerNote: data.has('playerNote') ? data.get('playerNote')?.toString() ?? null : undefined,
					playerNoteVisible: data.has('playerNoteVisible')
						? data.get('playerNoteVisible')?.toString() === 'true'
						: undefined,
				}
				: undefined;
			await worlds.plotQuests.setNodeState(nodeId, status, locals.user!.id, notes);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	advanceNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		const status = data.get('status')?.toString() ?? '';
		if (!nodeId || !status) return fail(400, { message: 'nodeId and status required' });
		try {
			const playerNote = data.get('playerNote')?.toString() ?? '';
			const missRaw = data.get('missSiblingIds')?.toString() ?? '';
			const missSiblingIds = missRaw
				? missRaw.split(',').map(s => s.trim()).filter(Boolean)
				: [];
			const result = await worlds.plotQuests.advanceNode(nodeId, {
				status,
				note: data.get('note')?.toString() ?? null,
				playerNote: playerNote || null,
				playerNoteVisible: data.has('playerNoteVisible')
					? data.get('playerNoteVisible')?.toString() === 'true'
					: !!playerNote.trim(),
				missSiblingIds,
			}, locals.user!.id);
			return {
				ok: true,
				workflowGap: (result as { workflowGap?: string | null }).workflowGap ?? null,
			};
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	revertNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const nodeId = (await request.formData()).get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.plotQuests.revertNode(nodeId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	setNodeCurrent: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const nodeId = (await request.formData()).get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.plotQuests.setNodeCurrent(nodeId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createEdge: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.plotQuests.createEdge(params.plotId, {
				kind: data.get('kind')?.toString() ?? '',
				fromNodeId: data.get('fromNodeId')?.toString() ?? '',
				toNodeId: data.get('toNodeId')?.toString() || null,
				toPlotQuestId: data.get('toPlotQuestId')?.toString() || null,
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteEdge: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const edgeId = (await request.formData()).get('edgeId')?.toString() ?? '';
		if (!edgeId) return fail(400, { message: 'edgeId required' });
		try {
			await worlds.plotQuests.deleteEdge(edgeId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createEntryReq: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		let payload: unknown = undefined;
		const raw = data.get('payload')?.toString();
		if (raw) {
			try { payload = JSON.parse(raw); }
			catch { return fail(400, { message: 'Invalid payload JSON' }); }
		}
		try {
			await worlds.plotQuests.createEntryReq(params.plotId, {
				sceneNodeId: data.get('sceneNodeId')?.toString() ?? '',
				kind: data.get('kind')?.toString() ?? '',
				label: data.get('label')?.toString() || null,
				payload,
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteEntryReq: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const entryReqId = (await request.formData()).get('entryReqId')?.toString() ?? '';
		if (!entryReqId) return fail(400, { message: 'entryReqId required' });
		try {
			await worlds.plotQuests.deleteEntryReq(entryReqId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createEffect: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		let payload: unknown = undefined;
		const raw = data.get('payload')?.toString();
		if (raw) {
			try { payload = JSON.parse(raw); }
			catch { return fail(400, { message: 'Invalid payload JSON' }); }
		}
		try {
			await worlds.plotQuests.createEffect(data.get('ownerNodeId')?.toString() ?? '', {
				kind: data.get('kind')?.toString() ?? '',
				label: data.get('label')?.toString() || null,
				payload,
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteEffect: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const effectId = (await request.formData()).get('effectId')?.toString() ?? '';
		if (!effectId) return fail(400, { message: 'effectId required' });
		try {
			await worlds.plotQuests.deleteEffect(effectId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createReward: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		let payload: unknown = undefined;
		const raw = data.get('payload')?.toString();
		if (raw) {
			try { payload = JSON.parse(raw); }
			catch { return fail(400, { message: 'Invalid payload JSON' }); }
		}
		try {
			await worlds.plotQuests.createReward(data.get('ownerNodeId')?.toString() ?? '', {
				kind: data.get('kind')?.toString() ?? '',
				label: data.get('label')?.toString() || null,
				payload,
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteReward: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const rewardId = (await request.formData()).get('rewardId')?.toString() ?? '';
		if (!rewardId) return fail(400, { message: 'rewardId required' });
		try {
			await worlds.plotQuests.deleteReward(rewardId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	applyFailureTimeout: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await worlds.plotQuests.applyFailureTimeout(params.plotId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	applyNodeTimeouts: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await worlds.plotQuests.applyNodeTimeouts(params.plotId, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	moveFlowchartNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.neural.updateNodeByEntity(
				params.worldId,
				'PLOT_NODE',
				nodeId,
				{ posX: Number(data.get('posX')), posY: Number(data.get('posY')) },
				locals.user!.id,
			);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	relayoutProgression: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await worlds.neural.relayoutProgression(params.worldId, { plotQuestId: params.plotId });
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
