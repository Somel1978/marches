// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/neural/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, db } from '@core/database';
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

	const [map, candidates] = await Promise.all([
		worlds.neural.getMap(params.worldId),
		worlds.neural.listCandidates(params.worldId),
	]);

	return { world, canManage, nodes: map.nodes, edges: map.edges, candidates };
};

export const actions: Actions = {
	addNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.neural.addNode(params.worldId, {
				entityType: data.get('entityType')?.toString() ?? '',
				entityId:   data.get('entityId')?.toString() ?? '',
				posX:       Number(data.get('posX')),
				posY:       Number(data.get('posY')),
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
		try {
			const patch: { posX?: number; posY?: number; note?: string | null } = {};
			if (data.has('posX')) patch.posX = Number(data.get('posX'));
			if (data.has('posY')) patch.posY = Number(data.get('posY'));
			if (data.has('note')) patch.note = data.get('note')?.toString() ?? null;
			await worlds.neural.updateNode(nodeId, patch, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeNode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.neural.removeNode(nodeId, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addEdge: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.neural.addEdge(params.worldId, {
				fromNodeId: data.get('fromNodeId')?.toString() ?? '',
				toNodeId:   data.get('toNodeId')?.toString() ?? '',
				label:      data.get('label')?.toString() ?? '',
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateEdge: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const edgeId = data.get('edgeId')?.toString() ?? '';
		if (!edgeId) return fail(400, { message: 'edgeId required' });
		try {
			await worlds.neural.updateEdge(edgeId, {
				label: data.get('label')?.toString() ?? null,
				notes: data.get('notes')?.toString() ?? null,
			}, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeEdge: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const edgeId = data.get('edgeId')?.toString() ?? '';
		if (!edgeId) return fail(400, { message: 'edgeId required' });
		try {
			await worlds.neural.removeEdge(edgeId, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
