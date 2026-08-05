// apps/admin/src/routes/(app)/world/[id]/neural/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');

	const canEdit = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' }).allowed;

	const [map, candidates] = await Promise.all([
		worlds.neural.getMap(params.id),
		worlds.neural.listCandidates(params.id),
	]);

	return {
		world,
		canEdit,
		nodes: map.nodes,
		edges: map.edges,
		candidates,
	};
};

export const actions: Actions = {
	addNode: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.neural.addNode(params.id, {
				entityType: data.get('entityType')?.toString() ?? '',
				entityId:   data.get('entityId')?.toString() ?? '',
				posX:       Number(data.get('posX')),
				posY:       Number(data.get('posY')),
				layer:      'LORE',
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateNode: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			const patch: { posX?: number; posY?: number; note?: string | null } = {};
			if (data.has('posX')) patch.posX = Number(data.get('posX'));
			if (data.has('posY')) patch.posY = Number(data.get('posY'));
			if (data.has('note')) patch.note = data.get('note')?.toString() ?? null;
			await worlds.neural.updateNode(nodeId, patch, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeNode: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const nodeId = data.get('nodeId')?.toString() ?? '';
		if (!nodeId) return fail(400, { message: 'nodeId required' });
		try {
			await worlds.neural.removeNode(nodeId, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addEdge: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.neural.addEdge(params.id, {
				fromNodeId: data.get('fromNodeId')?.toString() ?? '',
				toNodeId: data.get('toNodeId')?.toString() ?? '',
				label: data.get('label')?.toString() ?? '',
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateEdge: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const edgeId = data.get('edgeId')?.toString() ?? '';
		if (!edgeId) return fail(400, { message: 'edgeId required' });
		try {
			await worlds.neural.updateEdge(edgeId, {
				label: data.get('label')?.toString() ?? null,
				notes: data.get('notes')?.toString() ?? null,
			}, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeEdge: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const edgeId = data.get('edgeId')?.toString() ?? '';
		if (!edgeId) return fail(400, { message: 'edgeId required' });
		try {
			await worlds.neural.removeEdge(edgeId, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

};
