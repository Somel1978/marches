// shared/database/dbapi/write/world/neural-map.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { NeuralEntityType, NeuralMapLayer } from '@prisma/client';
import { layoutPlotFlowchart } from '../../../lib/plot-graph/layout.ts';

const ENTITY_TYPES: NeuralEntityType[] = [
	'REGION', 'LOCATION', 'FACTION', 'NPC', 'QUEST', 'CHARACTER', 'JOURNAL', 'PLOT_QUEST', 'PLOT_NODE',
];

const LAYERS: NeuralMapLayer[] = ['LORE', 'PROGRESSION'];

function parseLayer(raw: string | undefined | null, entityType: NeuralEntityType): NeuralMapLayer {
	if (raw) {
		const l = raw.toUpperCase() as NeuralMapLayer;
		if (!LAYERS.includes(l)) throw new ValidationError(`Invalid layer: ${raw}`);
		return l;
	}
	return entityType === 'PLOT_NODE' ? 'PROGRESSION' : 'LORE';
}

function parseEntityType(raw: string): NeuralEntityType {
	const t = raw.toUpperCase() as NeuralEntityType;
	if (!ENTITY_TYPES.includes(t)) throw new ValidationError(`Invalid entity type: ${raw}`);
	return t;
}

async function assertWorld(worldId: string) {
	const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true } });
	if (!world) throw new NotFoundError('World', worldId);
}

/** Verify the entity exists and belongs to this world (best-effort for soft IDs). */
async function assertEntityInWorld(
	worldId: string,
	entityType: NeuralEntityType,
	entityId: string,
): Promise<void> {
	switch (entityType) {
		case 'REGION': {
			const r = await db.region.findFirst({ where: { id: entityId, worldId }, select: { id: true } });
			if (!r) throw new ValidationError('Region not found in this world.');
			return;
		}
		case 'LOCATION': {
			const l = await db.location.findFirst({
				where: { id: entityId, region: { worldId } },
				select: { id: true },
			});
			if (!l) throw new ValidationError('Location not found in this world.');
			return;
		}
		case 'FACTION': {
			const f = await db.faction.findFirst({ where: { id: entityId, worldId }, select: { id: true } });
			if (!f) throw new ValidationError('Faction not found in this world.');
			return;
		}
		case 'NPC': {
			const n = await db.npc.findFirst({ where: { id: entityId, worldId }, select: { id: true } });
			if (!n) throw new ValidationError('NPC not found in this world.');
			return;
		}
		case 'QUEST': {
			const regionIds = (await db.region.findMany({
				where: { worldId },
				select: { id: true },
			})).map(r => r.id);
			const q = await db.quest.findFirst({
				where: { id: entityId, regionId: { in: regionIds } },
				select: { id: true },
			});
			if (!q) throw new ValidationError('Quest not found in this world.');
			return;
		}
		case 'CHARACTER': {
			const c = await db.character.findFirst({
				where: { id: entityId, worldId },
				select: { id: true },
			});
			if (!c) throw new ValidationError('Character not found in this world.');
			return;
		}
		case 'JOURNAL': {
			const j = await db.worldJournal.findFirst({
				where: { id: entityId, worldId },
				select: { id: true },
			});
			if (!j) throw new ValidationError('Journal not found in this world.');
			return;
		}
		case 'PLOT_QUEST': {
			const p = await db.plotQuest.findFirst({
				where: { id: entityId, worldId },
				select: { id: true },
			});
			if (!p) throw new ValidationError('Plot quest not found in this world.');
			return;
		}
		case 'PLOT_NODE': {
			const n = await db.plotNode.findFirst({
				where: { id: entityId, plotQuest: { worldId } },
				select: { id: true },
			});
			if (!n) throw new ValidationError('Plot node not found in this world.');
			return;
		}
	}
}

export async function addNeuralNode(
	worldId: string,
	input: {
		entityType: string;
		entityId: string;
		posX?: number;
		posY?: number;
		note?: string | null;
		layer?: string | null;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const entityType = parseEntityType(input.entityType);
	const entityId = input.entityId?.trim();
	if (!entityId) throw new ValidationError('entityId is required.');
	await assertEntityInWorld(worldId, entityType, entityId);
	const layer = parseLayer(input.layer, entityType);
	if (entityType === 'PLOT_NODE' && layer !== 'PROGRESSION') {
		throw new ValidationError('Plot nodes belong on the Progression layer.');
	}
	if (entityType !== 'PLOT_NODE' && layer === 'PROGRESSION') {
		throw new ValidationError('Only plot nodes can be placed on the Progression layer.');
	}

	const posX = Number.isFinite(input.posX) ? Number(input.posX) : 500 + (Math.random() * 80 - 40);
	const posY = Number.isFinite(input.posY) ? Number(input.posY) : 500 + (Math.random() * 80 - 40);

	try {
		const node = await db.neuralMapNode.create({
			data: {
				worldId,
				entityType,
				entityId,
				layer,
				posX,
				posY,
				note: input.note?.trim() || null,
			},
		});
		await logAudit(db, {
			actorId,
			action: 'CREATE',
			resourceKey: 'World',
			resourceId: worldId,
			after: { neuralNode: node },
			metadata: { kind: 'neural_node' },
		});
		return node;
	} catch (e: any) {
		if (e?.code === 'P2002') throw new ValidationError('That element is already on the map.');
		throw e;
	}
}

export async function updateNeuralNode(
	nodeId: string,
	input: { posX?: number; posY?: number; note?: string | null },
	actorId: string,
	worldId?: string,
) {
	const existing = await db.neuralMapNode.findUnique({ where: { id: nodeId } });
	if (!existing) throw new NotFoundError('NeuralMapNode', nodeId);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Node is not on this world map.');

	const data: { posX?: number; posY?: number; note?: string | null } = {};
	if (input.posX !== undefined) {
		if (!Number.isFinite(input.posX)) throw new ValidationError('posX must be a number.');
		data.posX = Number(input.posX);
	}
	if (input.posY !== undefined) {
		if (!Number.isFinite(input.posY)) throw new ValidationError('posY must be a number.');
		data.posY = Number(input.posY);
	}
	if (input.note !== undefined) data.note = input.note?.trim() || null;

	const node = await db.neuralMapNode.update({ where: { id: nodeId }, data });
	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { neuralNode: existing },
		after: { neuralNode: node },
		metadata: { kind: 'neural_node' },
	});
	return node;
}

export async function removeNeuralNode(nodeId: string, actorId: string, worldId?: string) {
	const existing = await db.neuralMapNode.findUnique({ where: { id: nodeId } });
	if (!existing) throw new NotFoundError('NeuralMapNode', nodeId);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Node is not on this world map.');

	await db.neuralMapNode.delete({ where: { id: nodeId } });
	await logAudit(db, {
		actorId,
		action: 'DELETE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { neuralNode: existing },
		metadata: { kind: 'neural_node' },
	});
	return { ok: true };
}

/** Move a Progression node by PlotNode entity id (flowchart drag). */
export async function updateNeuralNodeByEntity(
	worldId: string,
	entityType: string,
	entityId: string,
	input: { posX?: number; posY?: number },
	actorId: string,
) {
	const type = parseEntityType(entityType);
	const id = entityId?.trim();
	if (!id) throw new ValidationError('entityId is required.');
	const existing = await db.neuralMapNode.findFirst({
		where: { worldId, entityType: type, entityId: id },
	});
	if (!existing) {
		// Ensure placement exists (sync), then retry
		if (type === 'PLOT_NODE') await syncProgressionLayer(worldId);
		const again = await db.neuralMapNode.findFirst({
			where: { worldId, entityType: type, entityId: id },
		});
		if (!again) throw new NotFoundError('NeuralMapNode', id);
		return updateNeuralNode(again.id, input, actorId, worldId);
	}
	return updateNeuralNode(existing.id, input, actorId, worldId);
}

export async function addNeuralEdge(
	worldId: string,
	input: {
		fromNodeId: string;
		toNodeId: string;
		label?: string | null;
		notes?: string | null;
		directed?: boolean;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	if (!input.fromNodeId || !input.toNodeId) throw new ValidationError('fromNodeId and toNodeId are required.');
	if (input.fromNodeId === input.toNodeId) throw new ValidationError('Cannot connect a node to itself.');

	const [from, to] = await Promise.all([
		db.neuralMapNode.findUnique({ where: { id: input.fromNodeId } }),
		db.neuralMapNode.findUnique({ where: { id: input.toNodeId } }),
	]);
	if (!from || from.worldId !== worldId) throw new ValidationError('fromNode not on this world map.');
	if (!to || to.worldId !== worldId) throw new ValidationError('toNode not on this world map.');

	const edge = await db.neuralMapEdge.create({
		data: {
			worldId,
			fromNodeId: input.fromNodeId,
			toNodeId: input.toNodeId,
			label: input.label?.trim() || null,
			notes: input.notes?.trim() || null,
			directed: input.directed !== false,
		},
	});
	await logAudit(db, {
		actorId,
		action: 'CREATE',
		resourceKey: 'World',
		resourceId: worldId,
		after: { neuralEdge: edge },
		metadata: { kind: 'neural_edge' },
	});
	return edge;
}

export async function updateNeuralEdge(
	edgeId: string,
	input: { label?: string | null; notes?: string | null; directed?: boolean },
	actorId: string,
	worldId?: string,
) {
	const existing = await db.neuralMapEdge.findUnique({ where: { id: edgeId } });
	if (!existing) throw new NotFoundError('NeuralMapEdge', edgeId);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Edge is not on this world map.');

	const data: { label?: string | null; notes?: string | null; directed?: boolean } = {};
	if (input.label !== undefined) data.label = input.label?.trim() || null;
	if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
	if (input.directed !== undefined) data.directed = !!input.directed;

	const edge = await db.neuralMapEdge.update({ where: { id: edgeId }, data });
	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { neuralEdge: existing },
		after: { neuralEdge: edge },
		metadata: { kind: 'neural_edge' },
	});
	return edge;
}

export async function removeNeuralEdge(edgeId: string, actorId: string, worldId?: string) {
	const existing = await db.neuralMapEdge.findUnique({ where: { id: edgeId } });
	if (!existing) throw new NotFoundError('NeuralMapEdge', edgeId);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Edge is not on this world map.');

	await db.neuralMapEdge.delete({ where: { id: edgeId } });
	await logAudit(db, {
		actorId,
		action: 'DELETE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { neuralEdge: existing },
		metadata: { kind: 'neural_edge' },
	});
	return { ok: true };
}

async function loadPlotLayoutInputs(plotQuestId: string) {
	const [nodes, edges] = await Promise.all([
		db.plotNode.findMany({
			where: { plotQuestId },
			select: {
				id: true,
				parentNodeId: true,
				kind: true,
				sortOrder: true,
				title: true,
			},
			orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		}),
		db.plotEdge.findMany({
			where: { plotQuestId },
			select: { fromNodeId: true, toNodeId: true, kind: true },
		}),
	]);
	return { nodes, edges };
}

/**
 * Ensure Progression layer has a NeuralMapNode for every PlotNode in the world (or one plot).
 * - Adds missing placements with a per-plot layout
 * - Never moves nodes the DM already positioned
 * - Removes orphan PLOT_NODE placements whose PlotNode was deleted
 */
export async function syncProgressionLayer(
	worldId: string,
	opts?: { plotQuestId?: string },
): Promise<{ added: number; removed: number }> {
	await assertWorld(worldId);

	const plots = await db.plotQuest.findMany({
		where: {
			worldId,
			...(opts?.plotQuestId ? { id: opts.plotQuestId } : {}),
		},
		select: { id: true, title: true },
		orderBy: { title: 'asc' },
	});

	const allWorldPlotNodes = await db.plotNode.findMany({
		where: { plotQuest: { worldId } },
		select: { id: true },
	});
	const validIds = new Set(allWorldPlotNodes.map(n => n.id));

	const placed = await db.neuralMapNode.findMany({
		where: { worldId, entityType: 'PLOT_NODE' },
		select: { id: true, entityId: true },
	});

	const orphans = placed.filter(p => !validIds.has(p.entityId));
	if (orphans.length) {
		await db.neuralMapNode.deleteMany({ where: { id: { in: orphans.map(o => o.id) } } });
	}

	const placedIds = new Set(placed.filter(p => validIds.has(p.entityId)).map(p => p.entityId));
	let added = 0;

	// When syncing one plot, still need global plot index for stable columns — use all world plots order
	const allPlots = opts?.plotQuestId
		? await db.plotQuest.findMany({
			where: { worldId },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		})
		: plots;

	const plotIndexById = new Map(allPlots.map((p, i) => [p.id, i]));

	for (const plot of plots) {
		const { nodes, edges } = await loadPlotLayoutInputs(plot.id);
		const missing = nodes.filter(n => !placedIds.has(n.id));
		if (!missing.length) continue;

		const layout = layoutPlotFlowchart(plotIndexById.get(plot.id) ?? 0, nodes, edges);
		for (const n of missing) {
			const p = layout.get(n.id) ?? { posX: 500, posY: 500 };
			try {
				await db.neuralMapNode.create({
					data: {
						worldId,
						entityType: 'PLOT_NODE',
						entityId: n.id,
						layer: 'PROGRESSION',
						posX: p.posX,
						posY: p.posY,
					},
				});
				placedIds.add(n.id);
				added++;
			} catch (e: any) {
				if (e?.code === 'P2002') continue; // race / already placed
				throw e;
			}
		}
	}

	return { added, removed: orphans.length };
}

/**
 * Force-reposition Progression neural nodes with left→right flowchart layout.
 * Opt-in only — default sync never moves existing placements.
 */
export async function relayoutProgressionLayer(
	worldId: string,
	opts?: { plotQuestId?: string },
): Promise<{ updated: number }> {
	await assertWorld(worldId);
	await syncProgressionLayer(worldId, opts);

	const plots = await db.plotQuest.findMany({
		where: {
			worldId,
			...(opts?.plotQuestId ? { id: opts.plotQuestId } : {}),
		},
		select: { id: true, title: true },
		orderBy: { title: 'asc' },
	});

	const allPlots = opts?.plotQuestId
		? await db.plotQuest.findMany({
			where: { worldId },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		})
		: plots;
	const plotIndexById = new Map(allPlots.map((p, i) => [p.id, i]));

	let updated = 0;
	for (const plot of plots) {
		const { nodes, edges } = await loadPlotLayoutInputs(plot.id);
		const layout = layoutPlotFlowchart(plotIndexById.get(plot.id) ?? 0, nodes, edges);
		for (const n of nodes) {
			const p = layout.get(n.id);
			if (!p) continue;
			const res = await db.neuralMapNode.updateMany({
				where: { worldId, entityType: 'PLOT_NODE', entityId: n.id },
				data: { posX: p.posX, posY: p.posY },
			});
			updated += res.count;
		}
	}
	return { updated };
}
