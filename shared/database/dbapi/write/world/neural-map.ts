// shared/database/dbapi/write/world/neural-map.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { NeuralEntityType } from '@prisma/client';

const ENTITY_TYPES: NeuralEntityType[] = [
	'REGION', 'LOCATION', 'FACTION', 'NPC', 'QUEST', 'CHARACTER', 'JOURNAL',
];

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
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const entityType = parseEntityType(input.entityType);
	const entityId = input.entityId?.trim();
	if (!entityId) throw new ValidationError('entityId is required.');
	await assertEntityInWorld(worldId, entityType, entityId);

	const posX = Number.isFinite(input.posX) ? Number(input.posX) : 500 + (Math.random() * 80 - 40);
	const posY = Number.isFinite(input.posY) ? Number(input.posY) : 500 + (Math.random() * 80 - 40);

	try {
		const node = await db.neuralMapNode.create({
			data: {
				worldId,
				entityType,
				entityId,
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
