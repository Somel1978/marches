// shared/database/dbapi/write/world/plot-progression.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { assertAcyclic } from '../../../lib/plot-graph/index.ts';
import type {
	PlotEdgeKind,
	PlotEffectKind,
	PlotEncounterKind,
	PlotEntryReqKind,
	PlotNodeKind,
	PlotNodeStatus,
	PlotObjectiveTier,
	PlotRewardKind,
	Prisma,
} from '@prisma/client';

const NODE_KINDS: PlotNodeKind[] = [
	'OBJECTIVE', 'FAILURE_CONDITION', 'SCENE', 'DISCOVERY', 'ENCOUNTER', 'DECISION',
	'DECISION_OPTION', 'EXIT', 'ENDING',
];
const EDGE_KINDS: PlotEdgeKind[] = ['REQUIRES', 'UNLOCKS', 'BLOCKS'];
const STATUSES: PlotNodeStatus[] = [
	'LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED', 'FAILED', 'MISSED', 'BLOCKED',
];
const TIERS: PlotObjectiveTier[] = ['PRIMARY', 'OPTIONAL'];
const ENCOUNTER_KINDS: PlotEncounterKind[] = ['COMBAT', 'PUZZLE', 'TRAP', 'SOCIAL'];
const EFFECT_KINDS: PlotEffectKind[] = ['REPUTATION', 'NPC_FLAG', 'LOCK_PLOT_QUEST', 'CUSTOM'];
const REWARD_KINDS: PlotRewardKind[] = ['ITEM', 'CURRENCY', 'CUSTOM'];
const ENTRY_KINDS: PlotEntryReqKind[] = [
	'QUEST_ACCEPTED', 'NPC_ALIVE', 'NODE_COMPLETED', 'OBJECTIVE_COMPLETE', 'CUSTOM',
];

const PARENT_RULES: Partial<Record<PlotNodeKind, PlotNodeKind | null>> = {
	OBJECTIVE: null,
	FAILURE_CONDITION: null,
	SCENE: null,
	ENDING: null,
	DISCOVERY: 'SCENE',
	ENCOUNTER: 'SCENE',
	DECISION: 'SCENE',
	EXIT: 'SCENE',
	DECISION_OPTION: 'DECISION',
};

function parseEncounterFields(
	kind: PlotNodeKind,
	input: {
		encounterKind?: string | null;
		socialFactionId?: string | null;
		socialNpcId?: string | null;
	},
	required: boolean,
): {
	encounterKind: PlotEncounterKind | null;
	socialFactionId: string | null;
	socialNpcId: string | null;
} {
	if (kind !== 'ENCOUNTER') {
		return { encounterKind: null, socialFactionId: null, socialNpcId: null };
	}
	const raw = (input.encounterKind ?? '').toString().trim().toUpperCase();
	if (!raw) {
		if (required) throw new ValidationError('Encounter type is required (Combat / Puzzles / Traps / Social).');
		return { encounterKind: null, socialFactionId: null, socialNpcId: null };
	}
	const encounterKind = raw as PlotEncounterKind;
	if (!ENCOUNTER_KINDS.includes(encounterKind)) {
		throw new ValidationError(`Invalid encounter type: ${input.encounterKind}`);
	}
	if (encounterKind === 'SOCIAL') {
		return {
			encounterKind,
			socialFactionId: input.socialFactionId?.trim() || null,
			socialNpcId: input.socialNpcId?.trim() || null,
		};
	}
	return { encounterKind, socialFactionId: null, socialNpcId: null };
}

async function loadPlot(plotQuestId: string) {
	const plot = await db.plotQuest.findUnique({ where: { id: plotQuestId } });
	if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
	return plot;
}

async function graphSnapshot(plotQuestId: string) {
	const [nodes, edges] = await Promise.all([
		db.plotNode.findMany({
			where: { plotQuestId },
			select: { id: true, plotQuestId: true, parentNodeId: true, kind: true, title: true, objectiveTier: true },
		}),
		db.plotEdge.findMany({ where: { plotQuestId } }),
	]);
	return {
		nodes: nodes.map(n => ({
			id: n.id,
			plotQuestId: n.plotQuestId,
			parentNodeId: n.parentNodeId,
			kind: n.kind,
			title: n.title,
			objectiveTier: n.objectiveTier,
		})),
		edges: edges.map(e => ({
			id: e.id,
			plotQuestId: e.plotQuestId,
			fromNodeId: e.fromNodeId,
			toNodeId: e.toNodeId,
			toPlotQuestId: e.toPlotQuestId,
			kind: e.kind,
		})),
	};
}

function parseNodeFailureDay(
	kind: PlotNodeKind,
	raw: number | null | undefined,
): number | null | undefined {
	if (raw === undefined) return undefined;
	if (raw === null) return null;
	if (!Number.isInteger(raw)) throw new ValidationError('failureTimeoutDay must be an integer absolute day or null.');
	if (kind !== 'SCENE' && kind !== 'OBJECTIVE') {
		throw new ValidationError('Failure time is only allowed on scenes and objectives.');
	}
	return raw;
}

export async function createPlotNode(
	plotQuestId: string,
	input: {
		kind: string;
		title: string;
		summary?: string | null;
		description?: string | null;
		parentNodeId?: string | null;
		objectiveTier?: string | null;
		encounterKind?: string | null;
		socialFactionId?: string | null;
		socialNpcId?: string | null;
		failureTimeoutDay?: number | null;
		sortOrder?: number;
	},
	actorId: string,
) {
	await loadPlot(plotQuestId);
	const kind = input.kind?.toUpperCase() as PlotNodeKind;
	if (!NODE_KINDS.includes(kind)) throw new ValidationError(`Invalid node kind: ${input.kind}`);
	const title = input.title?.trim();
	if (!title) throw new ValidationError('Title is required.');

	const expectedParent = PARENT_RULES[kind];
	let parentNodeId = input.parentNodeId ?? null;
	if (expectedParent == null) {
		parentNodeId = null;
	} else {
		if (!parentNodeId) throw new ValidationError(`${kind} requires a parent ${expectedParent}.`);
		const parent = await db.plotNode.findFirst({ where: { id: parentNodeId, plotQuestId } });
		if (!parent) throw new ValidationError('Parent node not found in this plot.');
		if (parent.kind !== expectedParent) {
			throw new ValidationError(`${kind} parent must be a ${expectedParent}.`);
		}
	}

	let objectiveTier: PlotObjectiveTier | null = null;
	if (kind === 'OBJECTIVE') {
		const t = (input.objectiveTier ?? 'PRIMARY').toUpperCase() as PlotObjectiveTier;
		if (!TIERS.includes(t)) throw new ValidationError(`Invalid objective tier: ${input.objectiveTier}`);
		objectiveTier = t;
	}

	const encounter = parseEncounterFields(kind, input, true);
	const failureTimeoutDay = parseNodeFailureDay(kind, input.failureTimeoutDay) ?? null;

	const node = await db.plotNode.create({
		data: {
			plotQuestId,
			parentNodeId,
			kind,
			title,
			summary: input.summary?.trim() || null,
			description: input.description?.trim() || null,
			objectiveTier,
			encounterKind: encounter.encounterKind,
			socialFactionId: encounter.socialFactionId,
			socialNpcId: encounter.socialNpcId,
			failureTimeoutDay: kind === 'SCENE' || kind === 'OBJECTIVE' ? failureTimeoutDay : null,
			sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
			state: { create: { status: kind === 'SCENE' || kind === 'OBJECTIVE' ? 'AVAILABLE' : 'LOCKED' } },
		},
		include: { state: true },
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'PlotNode', resourceId: node.id,
		after: node, metadata: { plotQuestId },
	});

	// Keep neural Progression layer in sync for this plot
	try {
		const plot = await db.plotQuest.findUnique({ where: { id: plotQuestId }, select: { worldId: true } });
		if (plot) {
			const { syncProgressionLayer } = await import('./neural-map.ts');
			await syncProgressionLayer(plot.worldId, { plotQuestId });
		}
	} catch {
		/* non-fatal — map syncs again on next neural load */
	}

	return node;
}

export async function updatePlotNode(
	id: string,
	input: {
		title?: string;
		summary?: string | null;
		description?: string | null;
		objectiveTier?: string | null;
		encounterKind?: string | null;
		socialFactionId?: string | null;
		socialNpcId?: string | null;
		failureTimeoutDay?: number | null;
		sortOrder?: number;
		parentNodeId?: string | null;
	},
	actorId: string,
) {
	const existing = await db.plotNode.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotNode', id);

	const data: Prisma.PlotNodeUpdateInput = {};
	if (input.title !== undefined) {
		const t = input.title.trim();
		if (!t) throw new ValidationError('Title is required.');
		data.title = t;
	}
	if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
	if (input.description !== undefined) data.description = input.description?.trim() || null;
	if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder) || 0;
	if (input.objectiveTier !== undefined && existing.kind === 'OBJECTIVE') {
		const t = (input.objectiveTier ?? 'PRIMARY').toUpperCase() as PlotObjectiveTier;
		if (!TIERS.includes(t)) throw new ValidationError(`Invalid objective tier: ${input.objectiveTier}`);
		data.objectiveTier = t;
	}
	if (
		existing.kind === 'ENCOUNTER'
		&& (
			input.encounterKind !== undefined
			|| input.socialFactionId !== undefined
			|| input.socialNpcId !== undefined
		)
	) {
		const encounter = parseEncounterFields(
			'ENCOUNTER',
			{
				encounterKind: input.encounterKind !== undefined
					? input.encounterKind
					: existing.encounterKind,
				socialFactionId: input.socialFactionId !== undefined
					? input.socialFactionId
					: existing.socialFactionId,
				socialNpcId: input.socialNpcId !== undefined
					? input.socialNpcId
					: existing.socialNpcId,
			},
			true,
		);
		data.encounterKind = encounter.encounterKind;
		data.socialFactionId = encounter.socialFactionId;
		data.socialNpcId = encounter.socialNpcId;
	}
	if (input.failureTimeoutDay !== undefined) {
		data.failureTimeoutDay = parseNodeFailureDay(existing.kind, input.failureTimeoutDay) ?? null;
	}
	if (input.parentNodeId !== undefined) {
		const expectedParent = PARENT_RULES[existing.kind];
		if (expectedParent == null) {
			data.parent = { disconnect: true };
		} else if (!input.parentNodeId) {
			throw new ValidationError(`${existing.kind} requires a parent.`);
		} else {
			const parent = await db.plotNode.findFirst({
				where: { id: input.parentNodeId, plotQuestId: existing.plotQuestId },
			});
			if (!parent || parent.kind !== expectedParent) {
				throw new ValidationError(`Parent must be a ${expectedParent} in this plot.`);
			}
			data.parent = { connect: { id: parent.id } };
		}
	}

	const node = await db.plotNode.update({ where: { id }, data, include: { state: true } });
	await logAudit(db, {
		actorId, action: 'UPDATE', resourceKey: 'PlotNode', resourceId: id,
		before: existing, after: node,
	});
	return node;
}

export async function deletePlotNode(id: string, actorId: string) {
	const existing = await db.plotNode.findUnique({
		where: { id },
		include: { plotQuest: { select: { worldId: true } } },
	});
	if (!existing) throw new NotFoundError('PlotNode', id);
	await db.plotNode.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'PlotNode', resourceId: id, before: existing,
	});

	// Drop board placement + prune orphans for this world
	await db.neuralMapNode.deleteMany({
		where: { entityType: 'PLOT_NODE', entityId: id },
	});
	try {
		const { syncProgressionLayer } = await import('./neural-map.ts');
		await syncProgressionLayer(existing.plotQuest.worldId, { plotQuestId: existing.plotQuestId });
	} catch {
		/* non-fatal */
	}
}

export async function createPlotEdge(
	plotQuestId: string,
	input: {
		fromNodeId: string;
		toNodeId?: string | null;
		toPlotQuestId?: string | null;
		kind: string;
		label?: string | null;
		notes?: string | null;
	},
	actorId: string,
) {
	await loadPlot(plotQuestId);
	const kind = input.kind?.toUpperCase() as PlotEdgeKind;
	if (!EDGE_KINDS.includes(kind)) throw new ValidationError(`Invalid edge kind: ${input.kind}`);

	const toNodeId = input.toNodeId || null;
	const toPlotQuestId = input.toPlotQuestId || null;
	if (!!toNodeId === !!toPlotQuestId) {
		throw new ValidationError('Edge must target exactly one of toNodeId or toPlotQuestId.');
	}

	const from = await db.plotNode.findFirst({ where: { id: input.fromNodeId, plotQuestId } });
	if (!from) throw new ValidationError('fromNodeId not found in this plot.');

	if (toNodeId) {
		const to = await db.plotNode.findFirst({ where: { id: toNodeId, plotQuestId } });
		if (!to) throw new ValidationError('toNodeId not found in this plot.');
	} else if (toPlotQuestId) {
		const target = await db.plotQuest.findUnique({ where: { id: toPlotQuestId }, select: { id: true } });
		if (!target) throw new ValidationError('toPlotQuestId not found.');
		if (toPlotQuestId === plotQuestId) throw new ValidationError('Cannot target the same plot quest.');
	}

	const snap = await graphSnapshot(plotQuestId);
	const cycle = assertAcyclic(snap.nodes, [
		...snap.edges,
		{
			id: 'pending',
			plotQuestId,
			fromNodeId: input.fromNodeId,
			toNodeId,
			toPlotQuestId,
			kind,
		},
	]);
	if (cycle) throw new ValidationError(cycle);

	const edge = await db.plotEdge.create({
		data: {
			plotQuestId,
			fromNodeId: input.fromNodeId,
			toNodeId,
			toPlotQuestId,
			kind,
			label: input.label?.trim() || null,
			notes: input.notes?.trim() || null,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'PlotEdge', resourceId: edge.id, after: edge,
	});
	return edge;
}

export async function deletePlotEdge(id: string, actorId: string) {
	const existing = await db.plotEdge.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotEdge', id);
	await db.plotEdge.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'PlotEdge', resourceId: id, before: existing,
	});
}

/**
 * Create a PlotEdge from two Progression neural placements (entityType PLOT_NODE).
 * Used by world Neural Connect on the Progression layer.
 */
export async function createPlotEdgeFromNeuralNodes(
	worldId: string,
	input: {
		fromNeuralNodeId: string;
		toNeuralNodeId: string;
		kind: string;
		label?: string | null;
	},
	actorId: string,
) {
	const [fromN, toN] = await Promise.all([
		db.neuralMapNode.findUnique({ where: { id: input.fromNeuralNodeId } }),
		db.neuralMapNode.findUnique({ where: { id: input.toNeuralNodeId } }),
	]);
	if (!fromN || fromN.worldId !== worldId) throw new ValidationError('fromNode not on this world map.');
	if (!toN || toN.worldId !== worldId) throw new ValidationError('toNode not on this world map.');
	if (fromN.entityType !== 'PLOT_NODE' || toN.entityType !== 'PLOT_NODE') {
		throw new ValidationError('Progression links must connect plot pieces.');
	}

	const [fromPlot, toPlot] = await Promise.all([
		db.plotNode.findUnique({
			where: { id: fromN.entityId },
			select: { id: true, plotQuestId: true },
		}),
		db.plotNode.findUnique({
			where: { id: toN.entityId },
			select: { id: true, plotQuestId: true },
		}),
	]);
	if (!fromPlot || !toPlot) throw new ValidationError('Plot piece not found for neural node.');
	if (fromPlot.plotQuestId !== toPlot.plotQuestId) {
		throw new ValidationError('Can only link pieces within the same plot quest.');
	}

	return createPlotEdge(fromPlot.plotQuestId, {
		kind: input.kind,
		fromNodeId: fromPlot.id,
		toNodeId: toPlot.id,
		label: input.label,
	}, actorId);
}

/** Delete PlotEdge by raw id or `plot-edge:{id}` overlay id from the neural board. */
export async function deletePlotEdgeFromNeuralOverlay(edgeId: string, actorId: string) {
	const raw = edgeId.startsWith('plot-edge:') ? edgeId.slice('plot-edge:'.length) : edgeId;
	return deletePlotEdge(raw, actorId);
}

export type PlotNodeStateNotes = {
	note?: string | null;
	playerNote?: string | null;
	playerNoteVisible?: boolean;
};

export async function setPlotNodeState(
	nodeId: string,
	status: string,
	actorId: string,
	noteOrNotes?: string | null | PlotNodeStateNotes,
) {
	const node = await db.plotNode.findUnique({ where: { id: nodeId } });
	if (!node) throw new NotFoundError('PlotNode', nodeId);
	const s = status.toUpperCase() as PlotNodeStatus;
	if (!STATUSES.includes(s)) throw new ValidationError(`Invalid status: ${status}`);

	const notes: PlotNodeStateNotes =
		noteOrNotes != null && typeof noteOrNotes === 'object'
			? noteOrNotes
			: { note: noteOrNotes as string | null | undefined };

	const prev = await db.plotNodeState.findUnique({ where: { nodeId } });
	const updateData: Prisma.PlotNodeStateUpdateInput = { status: s };
	if (notes.note !== undefined) updateData.note = notes.note?.trim() || null;
	if (notes.playerNote !== undefined) updateData.playerNote = notes.playerNote?.trim() || null;
	if (notes.playerNoteVisible !== undefined) {
		updateData.playerNoteVisible = notes.playerNoteVisible;
	} else if (notes.playerNote !== undefined) {
		updateData.playerNoteVisible = !!(notes.playerNote?.trim());
	}

	const state = await db.plotNodeState.upsert({
		where: { nodeId },
		create: {
			nodeId,
			status: s,
			note: notes.note?.trim() || null,
			playerNote: notes.playerNote?.trim() || null,
			playerNoteVisible: notes.playerNoteVisible ?? !!(notes.playerNote?.trim()),
		},
		update: updateData,
	});
	await logAudit(db, {
		actorId, action: 'UPDATE', resourceKey: 'PlotNodeState', resourceId: state.id,
		after: state, metadata: { nodeId, plotQuestId: node.plotQuestId },
	});

	// Apply attached PlotEffects when transitioning into COMPLETED or FAILED
	let appliedEffects: Awaited<ReturnType<typeof import('./apply-plot-effects.ts').applyPlotEffectsForNode>> = [];
	const becameTerminal =
		(s === 'COMPLETED' || s === 'FAILED')
		&& prev?.status !== s;
	if (becameTerminal) {
		const { applyPlotEffectsForNode } = await import('./apply-plot-effects.ts');
		appliedEffects = await applyPlotEffectsForNode(nodeId, actorId);
	}

	return { state, appliedEffects };
}

const TERMINAL_STATUSES: PlotNodeStatus[] = ['COMPLETED', 'FAILED', 'MISSED', 'BLOCKED'];

/** Owning SCENE id for a piece (decision options walk up through DECISION). */
async function sceneIdForNode(node: {
	id: string;
	kind: string;
	parentNodeId: string | null;
}): Promise<string | null> {
	if (node.kind === 'SCENE') return node.id;
	if (!node.parentNodeId) return null;
	if (
		node.kind === 'DISCOVERY'
		|| node.kind === 'ENCOUNTER'
		|| node.kind === 'DECISION'
		|| node.kind === 'EXIT'
	) {
		return node.parentNodeId;
	}
	if (node.kind === 'DECISION_OPTION') {
		const dec = await db.plotNode.findUnique({
			where: { id: node.parentNodeId },
			select: { parentNodeId: true, kind: true },
		});
		return dec?.kind === 'DECISION' ? dec.parentNodeId : null;
	}
	return null;
}

/**
 * After a step with no Unlocks edges: still move Current forward in the scene.
 * Yes/No decisions are steps even when they don't unlock anything.
 * Prefer Exits → other open Decisions → available Discoveries → the Scene itself.
 */
async function activateStructuralNextInScene(
	node: { id: string; kind: string; parentNodeId: string | null; plotQuestId: string },
	actorId: string,
	skipDecisionId: string | null,
): Promise<string[]> {
	const sceneId = await sceneIdForNode(node);
	if (!sceneId) return [];

	const kids = await db.plotNode.findMany({
		where: { parentNodeId: sceneId, plotQuestId: node.plotQuestId },
		include: { state: true },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
	});

	const activated: string[] = [];

	/** Sole Current: activate at most one piece, then stop. */
	async function activateOne(id: string, st: { status: string } | null): Promise<boolean> {
		if (!st || TERMINAL_STATUSES.includes(st.status as PlotNodeStatus)) return false;
		if (st.status === 'ACTIVE') {
			activated.push(id);
			return true;
		}
		if (st.status !== 'AVAILABLE') return false;
		await setPlotNodeState(id, 'ACTIVE', actorId);
		activated.push(id);
		return true;
	}

	// Only already-Available pieces; first match only (Current is a single step).
	for (const x of kids.filter(k => k.kind === 'EXIT')) {
		if (await activateOne(x.id, x.state)) return activated;
	}
	for (const d of kids.filter(k => k.kind === 'DECISION' && k.id !== skipDecisionId)) {
		if (await activateOne(d.id, d.state)) return activated;
	}
	for (const d of kids.filter(k => k.kind === 'DISCOVERY' || k.kind === 'ENCOUNTER')) {
		if (await activateOne(d.id, d.state)) return activated;
	}

	// Still in this scene — Current = scene
	const scene = await db.plotNode.findUnique({
		where: { id: sceneId },
		include: { state: true },
	});
	if (scene?.state && !TERMINAL_STATUSES.includes(scene.state.status)) {
		await setPlotNodeState(sceneId, 'ACTIVE', actorId);
		activated.push(sceneId);
	}
	return activated;
}

/**
 * Apply UNLOCKS / BLOCKS from a completed node.
 * UNLOCKS → OBJECTIVE always finishes (COMPLETED).
 * Other targets → ACTIVE (Current), unless preferInSceneCurrent and the target is
 * outside the scene — then AVAILABLE (opened) so Current can move to the next
 * in-scene step (e.g. Exit after a decision option).
 */
async function applyCompletionEdges(
	fromNodeId: string,
	plotQuestId: string,
	actorId: string,
	opts?: {
		/** When set, only in-scene unlocks become Current; out-of-scene open as Available */
		preferInSceneCurrent?: { sceneId: string };
	},
): Promise<{
	activatedIds: string[];
	graphUpdates: Array<{ nodeId: string; status: PlotNodeStatus }>;
}> {
	const edges = await db.plotEdge.findMany({
		where: { fromNodeId, plotQuestId },
		orderBy: { createdAt: 'asc' },
	});

	const activatedIds: string[] = [];
	const graphUpdates: Array<{ nodeId: string; status: PlotNodeStatus }> = [];
	const sceneId = opts?.preferInSceneCurrent?.sceneId ?? null;
	let assignedCurrent = false;

	for (const e of edges) {
		if (!e.toNodeId) continue; // cross-plot handled by effects / soft analysis
		const target = await db.plotNode.findUnique({
			where: { id: e.toNodeId },
			include: { state: true },
		});
		if (!target?.state) continue;
		if (TERMINAL_STATUSES.includes(target.state.status)) continue;

		if (e.kind === 'UNLOCKS') {
			// Any piece → objective means “finish that objective” (never Current on objectives)
			if (target.kind === 'OBJECTIVE') {
				if (target.state.status === 'COMPLETED') continue;
				await setPlotNodeState(target.id, 'COMPLETED', actorId);
				graphUpdates.push({ nodeId: target.id, status: 'COMPLETED' });
				continue;
			}

			let nextStatus: PlotNodeStatus = 'ACTIVE';
			if (sceneId) {
				const targetSceneId = await sceneIdForNode(target);
				const outOfScene =
					target.kind === 'SCENE'
					|| target.kind === 'ENDING'
					|| (targetSceneId != null && targetSceneId !== sceneId);
				if (outOfScene) nextStatus = 'AVAILABLE';
			}
			// Sole Current: only the first in-scene jump becomes Current; rest open Available
			if (nextStatus === 'ACTIVE' && assignedCurrent) nextStatus = 'AVAILABLE';

			if (target.state.status === nextStatus) {
				if (nextStatus === 'ACTIVE') {
					activatedIds.push(target.id);
					assignedCurrent = true;
				}
				continue;
			}
			await setPlotNodeState(target.id, nextStatus, actorId);
			graphUpdates.push({ nodeId: target.id, status: nextStatus });
			if (nextStatus === 'ACTIVE') {
				activatedIds.push(target.id);
				assignedCurrent = true;
			}
		} else if (e.kind === 'BLOCKS' && target.state.status !== 'BLOCKED') {
			await setPlotNodeState(target.id, 'BLOCKED', actorId);
			graphUpdates.push({ nodeId: target.id, status: 'BLOCKED' });
		}
	}

	return { activatedIds, graphUpdates };
}

/**
 * Playthrough advance: set status (+ notes), then on COMPLETED:
 * - Path choice (option): miss siblings + complete parent decision (always a step)
 * - UNLOCKS → **ACTIVE** (graph jump) — objectives finish → COMPLETED
 * - BLOCKS → BLOCKED
 * - Decision Unlocks/Blocks also fire when an option is taken
 * - If nothing unlocked: structural next in the same scene (exits / decisions / scene)
 */
export async function advancePlotNode(
	nodeId: string,
	input: {
		status: string;
		note?: string | null;
		playerNote?: string | null;
		playerNoteVisible?: boolean;
		/** When taking a decision path: other option ids to mark MISSED */
		missSiblingIds?: string[];
	},
	actorId: string,
) {
	const result = await setPlotNodeState(nodeId, input.status, actorId, {
		note: input.note,
		playerNote: input.playerNote,
		playerNoteVisible: input.playerNoteVisible,
	});

	const s = input.status.toUpperCase() as PlotNodeStatus;
	const graphUpdates: Array<{ nodeId: string; status: PlotNodeStatus }> = [];

	if (s === 'COMPLETED') {
		const node = await db.plotNode.findUnique({ where: { id: nodeId } });
		if (!node) throw new NotFoundError('PlotNode', nodeId);

		let completedDecisionId: string | null = null;

		// Path choice: record siblings as not taken + close the decision (no Unlocks required)
		if (node.kind === 'DECISION_OPTION' && node.parentNodeId) {
			completedDecisionId = node.parentNodeId;
			const siblings = await db.plotNode.findMany({
				where: {
					parentNodeId: node.parentNodeId,
					kind: 'DECISION_OPTION',
					id: { not: nodeId },
				},
				include: { state: true },
			});
			const missIds = new Set(input.missSiblingIds?.length
				? input.missSiblingIds
				: siblings.map(sib => sib.id));
			for (const sib of siblings) {
				if (!missIds.has(sib.id)) continue;
				if (sib.state && TERMINAL_STATUSES.includes(sib.state.status)) continue;
				await setPlotNodeState(sib.id, 'MISSED', actorId);
				graphUpdates.push({ nodeId: sib.id, status: 'MISSED' });
			}
			const decision = await db.plotNode.findUnique({
				where: { id: node.parentNodeId },
				include: { state: true },
			});
			if (decision?.state && !TERMINAL_STATUSES.includes(decision.state.status)) {
				await setPlotNodeState(decision.id, 'COMPLETED', actorId);
				graphUpdates.push({ nodeId: decision.id, status: 'COMPLETED' });
			}
		}

		const activatedIds: string[] = [];

		// After a path choice, keep Current in-scene (Exit / next piece). Out-of-scene
		// jumps open as Available until an Exit (or explicit jump) is taken.
		const optionSceneId = completedDecisionId
			? await sceneIdForNode(node)
			: null;
		const preferInScene = optionSceneId
			? { preferInSceneCurrent: { sceneId: optionSceneId } }
			: undefined;

		const fromEdges = await applyCompletionEdges(
			nodeId,
			node.plotQuestId,
			actorId,
			preferInScene,
		);
		activatedIds.push(...fromEdges.activatedIds);
		graphUpdates.push(...fromEdges.graphUpdates);

		// Decision-level Finish-objective / Unlocks fire when a path is taken
		if (completedDecisionId) {
			const decisionEdges = await applyCompletionEdges(
				completedDecisionId,
				node.plotQuestId,
				actorId,
				preferInScene,
			);
			activatedIds.push(...decisionEdges.activatedIds);
			graphUpdates.push(...decisionEdges.graphUpdates);
		}

		// Taking an Exit resolves the parent scene (leave the scene)
		let leftViaExit = false;
		if (node.kind === 'EXIT' && node.parentNodeId) {
			const parentScene = await db.plotNode.findUnique({
				where: { id: node.parentNodeId },
				include: { state: true },
			});
			if (
				parentScene?.kind === 'SCENE'
				&& parentScene.state
				&& !TERMINAL_STATUSES.includes(parentScene.state.status)
			) {
				leftViaExit = true;
				await setPlotNodeState(parentScene.id, 'COMPLETED', actorId);
				graphUpdates.push({ nodeId: parentScene.id, status: 'COMPLETED' });
				const sceneEdges = await applyCompletionEdges(
					parentScene.id,
					node.plotQuestId,
					actorId,
				);
				activatedIds.push(...sceneEdges.activatedIds);
				graphUpdates.push(...sceneEdges.graphUpdates);
			}
		}

		// Current follows Unlocks from the completed piece (and decision, if any).
		// Path choice with no Continue-to: do NOT invent a next step (no scene hack /
		// no fan-out to every Exit) — clear Current and warn the DM to fix the graph.
		let workflowGap: string | null = null;
		if (!leftViaExit && !activatedIds.length) {
			if (completedDecisionId) {
				workflowGap =
					`“${node.title}” has no Continue to / Unlocks follow-up. `
					+ 'Current has nowhere to go — open Progression and add a next step on this option (or its decision).';
				const stale = await db.plotNodeState.findMany({
					where: { status: 'ACTIVE', node: { plotQuestId: node.plotQuestId } },
					select: { nodeId: true },
				});
				for (const st of stale) {
					await setPlotNodeState(st.nodeId, 'AVAILABLE', actorId);
					graphUpdates.push({ nodeId: st.nodeId, status: 'AVAILABLE' });
				}
			} else {
				const structural = await activateStructuralNextInScene(
					node,
					actorId,
					null,
				);
				for (const id of structural) {
					activatedIds.push(id);
					graphUpdates.push({ nodeId: id, status: 'ACTIVE' });
				}
			}
		}

		// Sole Current: exactly one ACTIVE step when we do have a next step
		if (activatedIds.length > 1) {
			const primary = activatedIds[0]!;
			for (const id of activatedIds.slice(1)) {
				await setPlotNodeState(id, 'AVAILABLE', actorId);
				graphUpdates.push({ nodeId: id, status: 'AVAILABLE' });
			}
			activatedIds.length = 0;
			activatedIds.push(primary);
		}
		if (activatedIds.length) {
			graphUpdates.push(
				...await demoteOtherActive(node.plotQuestId, activatedIds[0]!, actorId),
			);
		}

		return { ...result, graphUpdates, workflowGap };
	} else if (s === 'ACTIVE') {
		// Move Current without completing: demote other ACTIVE markers
		const node = await db.plotNode.findUnique({ where: { id: nodeId } });
		if (!node) throw new NotFoundError('PlotNode', nodeId);
		const demoted = await demoteOtherActive(node.plotQuestId, nodeId, actorId);
		graphUpdates.push(...demoted);
	}

	return { ...result, graphUpdates, workflowGap: null as string | null };
}

const REVERT_CLEAR_STATUSES: PlotNodeStatus[] = [
	'COMPLETED', 'FAILED', 'MISSED', 'BLOCKED', 'ACTIVE',
];

function finishPlotPayload(payload: unknown): boolean {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
	return (payload as Record<string, unknown>).finishPlot === true;
}

/** Demote every other ACTIVE node in the plot to AVAILABLE (single Current). */
async function demoteOtherActive(
	plotQuestId: string,
	keepNodeId: string,
	actorId: string,
): Promise<Array<{ nodeId: string; status: PlotNodeStatus }>> {
	const staleActive = await db.plotNodeState.findMany({
		where: {
			status: 'ACTIVE',
			nodeId: { not: keepNodeId },
			node: { plotQuestId },
		},
		select: { nodeId: true },
	});
	const updates: Array<{ nodeId: string; status: PlotNodeStatus }> = [];
	for (const st of staleActive) {
		await setPlotNodeState(st.nodeId, 'AVAILABLE', actorId);
		updates.push({ nodeId: st.nodeId, status: 'AVAILABLE' });
	}
	return updates;
}

/**
 * Set a piece/scene as the sole Current (ACTIVE). Does not clear Taken history.
 * Use after revert when you want the Start node / scene again, or to jump Current.
 */
export async function setPlotNodeCurrent(nodeId: string, actorId: string) {
	const node = await db.plotNode.findUnique({
		where: { id: nodeId },
		include: { state: true },
	});
	if (!node) throw new NotFoundError('PlotNode', nodeId);
	if (node.kind === 'OBJECTIVE' || node.kind === 'FAILURE_CONDITION') {
		throw new ValidationError('Objectives and failure conditions cannot be Current — finish them via Unlocks.');
	}
	if (node.state && TERMINAL_STATUSES.includes(node.state.status)) {
		throw new ValidationError(
			'Cannot set a completed / failed / missed / blocked piece as Current. Revert that step first.',
		);
	}

	const graphUpdates: Array<{ nodeId: string; status: PlotNodeStatus }> = [];
	graphUpdates.push(...await demoteOtherActive(node.plotQuestId, nodeId, actorId));

	if (node.state?.status !== 'ACTIVE') {
		await setPlotNodeState(nodeId, 'ACTIVE', actorId);
		graphUpdates.push({ nodeId, status: 'ACTIVE' });
	}

	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'PlotNodeState',
		resourceId: node.state?.id ?? nodeId,
		metadata: { setCurrent: true, nodeId, plotQuestId: node.plotQuestId },
	});

	return { nodeId, status: 'ACTIVE' as PlotNodeStatus, graphUpdates };
}

/**
 * Revert a play step: clear that choice and every later choice (by state.updatedAt),
 * wipe play notes on cleared pieces, restore Current on the reverted decision/piece.
 * Does not undo world side-effects (renown, NPC flags, locked follow-up plots).
 */
export async function revertPlotNode(nodeId: string, actorId: string) {
	const node = await db.plotNode.findUnique({
		where: { id: nodeId },
		include: { state: true },
	});
	if (!node) throw new NotFoundError('PlotNode', nodeId);
	if (!node.state) {
		throw new ValidationError('Nothing to revert — this piece has no play state yet.');
	}

	const stepIds = new Set<string>([nodeId]);
	let restoreDecisionId: string | null = null;
	let restoreFocusId = nodeId;

	if (node.kind === 'DECISION_OPTION' && node.parentNodeId) {
		restoreDecisionId = node.parentNodeId;
		restoreFocusId = node.parentNodeId;
		const family = await db.plotNode.findMany({
			where: {
				OR: [
					{ id: node.parentNodeId },
					{ parentNodeId: node.parentNodeId, kind: 'DECISION_OPTION' },
				],
			},
			select: { id: true },
		});
		for (const f of family) stepIds.add(f.id);
	} else if (node.kind === 'DECISION') {
		restoreDecisionId = node.id;
		restoreFocusId = node.id;
		const opts = await db.plotNode.findMany({
			where: { parentNodeId: node.id, kind: 'DECISION_OPTION' },
			select: { id: true },
		});
		for (const o of opts) stepIds.add(o.id);
	}

	const stepStates = await db.plotNodeState.findMany({
		where: { nodeId: { in: [...stepIds] } },
	});
	const terminalStep = stepStates.filter(s =>
		TERMINAL_STATUSES.includes(s.status),
	);
	if (!terminalStep.length) {
		throw new ValidationError(
			'Nothing to revert — this step has not been resolved yet (no Taken / Missed / Failed / Blocked).',
		);
	}

	// Anchor: when this choice was recorded. Prefer the Taken option's time.
	let anchorMs: number;
	if (node.kind === 'DECISION_OPTION' && node.state.status === 'COMPLETED') {
		anchorMs = node.state.updatedAt.getTime();
	} else if (node.kind === 'DECISION_OPTION' && node.state.status === 'MISSED') {
		const taken = stepStates.find(s => s.status === 'COMPLETED');
		anchorMs = (taken ?? terminalStep.reduce((a, b) =>
			a.updatedAt.getTime() <= b.updatedAt.getTime() ? a : b)).updatedAt.getTime();
	} else {
		anchorMs = Math.min(...terminalStep.map(s => s.updatedAt.getTime()));
	}

	const allStates = await db.plotNodeState.findMany({
		where: { node: { plotQuestId: node.plotQuestId } },
		include: { node: { select: { id: true, title: true, kind: true } } },
	});

	const toClear = allStates.filter(s => {
		if (stepIds.has(s.nodeId)) return true;
		if (s.updatedAt.getTime() < anchorMs) return false;
		return REVERT_CLEAR_STATUSES.includes(s.status);
	});

	const clearedNodeIds = toClear.map(s => s.nodeId);
	const clearedTitles = toClear.map(s => s.node.title);

	if (clearedNodeIds.length) {
		await db.plotNodeState.updateMany({
			where: { nodeId: { in: clearedNodeIds } },
			data: {
				status: 'LOCKED',
				note: null,
				playerNote: null,
				playerNoteVisible: false,
			},
		});
	}

	// Restore Current on the decision (options choosable again) or the piece itself
	const graphUpdates: Array<{ nodeId: string; status: PlotNodeStatus }> = [];
	if (restoreDecisionId) {
		await setPlotNodeState(restoreDecisionId, 'ACTIVE', actorId);
		graphUpdates.push({ nodeId: restoreDecisionId, status: 'ACTIVE' });
		const opts = await db.plotNode.findMany({
			where: { parentNodeId: restoreDecisionId, kind: 'DECISION_OPTION' },
			select: { id: true },
		});
		for (const o of opts) {
			await setPlotNodeState(o.id, 'AVAILABLE', actorId);
			graphUpdates.push({ nodeId: o.id, status: 'AVAILABLE' });
		}
	} else {
		await setPlotNodeState(restoreFocusId, 'ACTIVE', actorId);
		graphUpdates.push({ nodeId: restoreFocusId, status: 'ACTIVE' });
	}

	// If a cleared ending finished the plot, reopen the plot for play
	const finishOwners = await db.plotEffect.findMany({
		where: {
			ownerNodeId: { in: clearedNodeIds },
			kind: 'CUSTOM',
		},
		select: { ownerNodeId: true, payload: true },
	});
	const clearedFinish = finishOwners.some(ef => finishPlotPayload(ef.payload));
	if (clearedFinish) {
		const plot = await db.plotQuest.findUnique({
			where: { id: node.plotQuestId },
			select: { id: true, status: true },
		});
		if (plot?.status === 'COMPLETED') {
			const { updatePlotQuest } = await import('./plot-quests.ts');
			await updatePlotQuest(plot.id, { status: 'ACTIVE' }, actorId);
		}
	}

	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'PlotNodeState',
		resourceId: node.state.id,
		metadata: {
			revert: true,
			nodeId,
			plotQuestId: node.plotQuestId,
			anchorMs,
			clearedNodeIds,
			restoredNodeId: restoreFocusId,
		},
	});

	return {
		clearedNodeIds,
		clearedTitles,
		restoredNodeId: restoreFocusId,
		graphUpdates,
	};
}

/**
 * Plot-global fail: when deadlineDay ≤ currentDay on an ACTIVE/DRAFT plot,
 * complete failure conditions (applies their effects) and mark plot FAILED.
 */
export async function applyPlotFailureTimeout(plotQuestId: string, actorId: string) {
	const plot = await db.plotQuest.findUnique({
		where: { id: plotQuestId },
		select: { id: true, worldId: true, status: true, deadlineDay: true },
	});
	if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
	if (plot.deadlineDay == null) {
		throw new ValidationError('No deadline set on this plot (deadline is the global fail timer).');
	}
	const calendar = await db.worldCalendar.findUnique({
		where: { worldId: plot.worldId },
		select: { currentDay: true },
	});
	const currentDay = calendar?.currentDay ?? 0;
	if (currentDay < plot.deadlineDay) {
		throw new ValidationError(`Deadline not due yet (day ${currentDay} < ${plot.deadlineDay}).`);
	}

	const failureNodes = await db.plotNode.findMany({
		where: { plotQuestId, kind: 'FAILURE_CONDITION' },
		select: { id: true },
	});
	const applied: unknown[] = [];
	for (const n of failureNodes) {
		applied.push(await setPlotNodeState(n.id, 'COMPLETED', actorId, 'Plot deadline'));
	}

	if (plot.status === 'ACTIVE' || plot.status === 'DRAFT') {
		await db.plotQuest.update({
			where: { id: plotQuestId },
			data: { status: 'FAILED' },
		});
		await logAudit(db, {
			actorId, action: 'UPDATE', resourceKey: 'PlotQuest', resourceId: plotQuestId,
			after: { status: 'FAILED' }, metadata: { reason: 'deadline', currentDay, deadlineDay: plot.deadlineDay },
		});
	}

	return { currentDay, deadlineDay: plot.deadlineDay, applied };
}

/** Mark overdue SCENE / OBJECTIVE nodes FAILED (does not fail the whole plot). */
export async function applyOverdueNodeTimeouts(plotQuestId: string, actorId: string) {
	const plot = await loadPlot(plotQuestId);
	const calendar = await db.worldCalendar.findUnique({
		where: { worldId: plot.worldId },
		select: { currentDay: true },
	});
	const currentDay = calendar?.currentDay ?? 0;

	const overdue = await db.plotNode.findMany({
		where: {
			plotQuestId,
			kind: { in: ['SCENE', 'OBJECTIVE'] },
			failureTimeoutDay: { not: null, lte: currentDay },
			OR: [
				{ state: null },
				{ state: { status: { notIn: ['FAILED', 'COMPLETED', 'MISSED', 'BLOCKED'] } } },
			],
		},
		select: { id: true, title: true, kind: true, failureTimeoutDay: true },
	});

	const applied: unknown[] = [];
	for (const n of overdue) {
		applied.push(await setPlotNodeState(n.id, 'FAILED', actorId, 'Node failure time'));
	}
	return { currentDay, count: applied.length, applied };
}

export async function createPlotEntryRequirement(
	plotQuestId: string,
	input: {
		sceneNodeId: string;
		kind: string;
		payload?: unknown;
		label?: string | null;
	},
	actorId: string,
) {
	await loadPlot(plotQuestId);
	const kind = input.kind?.toUpperCase() as PlotEntryReqKind;
	if (!ENTRY_KINDS.includes(kind)) throw new ValidationError(`Invalid entry requirement kind: ${input.kind}`);
	const scene = await db.plotNode.findFirst({
		where: { id: input.sceneNodeId, plotQuestId, kind: 'SCENE' },
	});
	if (!scene) throw new ValidationError('sceneNodeId must be a SCENE in this plot.');

	const row = await db.plotEntryRequirement.create({
		data: {
			plotQuestId,
			sceneNodeId: scene.id,
			kind,
			payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
			label: input.label?.trim() || null,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'PlotEntryRequirement', resourceId: row.id, after: row,
	});
	return row;
}

export async function deletePlotEntryRequirement(id: string, actorId: string) {
	const existing = await db.plotEntryRequirement.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotEntryRequirement', id);
	await db.plotEntryRequirement.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'PlotEntryRequirement', resourceId: id, before: existing,
	});
}

export async function createPlotEffect(
	ownerNodeId: string,
	input: { kind: string; label?: string | null; payload?: unknown; sortOrder?: number },
	actorId: string,
) {
	const owner = await db.plotNode.findUnique({ where: { id: ownerNodeId } });
	if (!owner) throw new NotFoundError('PlotNode', ownerNodeId);
	const kind = input.kind?.toUpperCase() as PlotEffectKind;
	if (!EFFECT_KINDS.includes(kind)) throw new ValidationError(`Invalid effect kind: ${input.kind}`);

	const row = await db.plotEffect.create({
		data: {
			ownerNodeId,
			kind,
			label: input.label?.trim() || null,
			payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
			sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'PlotEffect', resourceId: row.id, after: row,
	});
	return row;
}

export async function deletePlotEffect(id: string, actorId: string) {
	const existing = await db.plotEffect.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotEffect', id);
	await db.plotEffect.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'PlotEffect', resourceId: id, before: existing,
	});
}

export async function createPlotReward(
	ownerNodeId: string,
	input: { kind: string; label?: string | null; payload?: unknown; sortOrder?: number },
	actorId: string,
) {
	const owner = await db.plotNode.findUnique({ where: { id: ownerNodeId } });
	if (!owner) throw new NotFoundError('PlotNode', ownerNodeId);
	const kind = input.kind?.toUpperCase() as PlotRewardKind;
	if (!REWARD_KINDS.includes(kind)) throw new ValidationError(`Invalid reward kind: ${input.kind}`);

	const row = await db.plotReward.create({
		data: {
			ownerNodeId,
			kind,
			label: input.label?.trim() || null,
			payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
			sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'PlotReward', resourceId: row.id, after: row,
	});
	return row;
}

export async function deletePlotReward(id: string, actorId: string) {
	const existing = await db.plotReward.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('PlotReward', id);
	await db.plotReward.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'PlotReward', resourceId: id, before: existing,
	});
}

export async function updatePlotFailureTimeout(
	plotQuestId: string,
	failureTimeoutDay: number | null,
	actorId: string,
) {
	const existing = await loadPlot(plotQuestId);
	if (failureTimeoutDay != null && (!Number.isInteger(failureTimeoutDay))) {
		throw new ValidationError('failureTimeoutDay must be an integer absolute day or null.');
	}
	const plot = await db.plotQuest.update({
		where: { id: plotQuestId },
		data: { failureTimeoutDay },
	});
	await logAudit(db, {
		actorId, action: 'UPDATE', resourceKey: 'PlotQuest', resourceId: plotQuestId,
		before: existing, after: plot, metadata: { field: 'failureTimeoutDay' },
	});
	return plot;
}
