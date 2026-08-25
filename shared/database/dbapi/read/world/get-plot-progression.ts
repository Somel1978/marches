// shared/database/dbapi/read/world/get-plot-progression.ts
import { db } from '../../../index.ts';
import { NotFoundError } from '@core/errors';
import {
	computeProgressionAnalysis,
	type EntryReqWorldContext,
	type PlotEntryReqKind,
	type PlotGraphEdge,
	type PlotGraphEntryReq,
	type PlotGraphNode,
	type PlotGraphState,
} from '../../../lib/plot-graph/index.ts';

const QUEST_ACCEPTED_STATUSES = new Set([
	'IN_PROGRESS',
	'PENDING_RESULT',
	'PENDING_RESULT_APPROVAL',
	'COMPLETED',
]);

function payloadObj(payload: unknown): Record<string, unknown> {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		return payload as Record<string, unknown>;
	}
	return {};
}

async function buildEntryWorldContext(
	worldId: string,
	entryReqs: Array<{ kind: string; payload: unknown }>,
): Promise<EntryReqWorldContext> {
	const questIds = new Set<string>();
	const npcIds = new Set<string>();
	for (const req of entryReqs) {
		const p = payloadObj(req.payload);
		if (req.kind === 'QUEST_ACCEPTED' && p.questId) questIds.add(String(p.questId));
		if (req.kind === 'NPC_ALIVE' && p.npcId) npcIds.add(String(p.npcId));
	}

	const [quests, npcs] = await Promise.all([
		questIds.size
			? db.quest.findMany({
				where: { id: { in: [...questIds] } },
				select: { id: true, status: true },
			})
			: [],
		npcIds.size
			? db.npc.findMany({
				where: { id: { in: [...npcIds] }, worldId },
				select: { id: true, status: true },
			})
			: [],
	]);

	const questAccepted: Record<string, boolean> = {};
	for (const id of questIds) questAccepted[id] = false;
	for (const q of quests) questAccepted[q.id] = QUEST_ACCEPTED_STATUSES.has(q.status);

	const npcStatus: Record<string, string> = {};
	for (const n of npcs) npcStatus[n.id] = n.status;

	return { questAccepted, npcStatus };
}

export async function getPlotProgression(plotQuestId: string) {
	const plot = await db.plotQuest.findUnique({
		where: { id: plotQuestId },
		select: {
			id: true,
			worldId: true,
			title: true,
			status: true,
			deadlineDay: true,
			failureTimeoutDay: true,
		},
	});
	if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);

	const [nodes, edges, entryReqs, calendar, worldNpcs, worldFactions, worldCharacters, otherPlots, linkableQuests, plotFactions, plotNpcs] = await Promise.all([
		db.plotNode.findMany({
			where: { plotQuestId },
			orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
			include: {
				state: true,
				effects: { orderBy: { sortOrder: 'asc' } },
				rewards: { orderBy: { sortOrder: 'asc' } },
			},
		}),
		db.plotEdge.findMany({ where: { plotQuestId } }),
		db.plotEntryRequirement.findMany({ where: { plotQuestId }, orderBy: { createdAt: 'asc' } }),
		db.worldCalendar.findUnique({ where: { worldId: plot.worldId }, select: { currentDay: true } }),
		db.npc.findMany({
			where: { worldId: plot.worldId },
			select: { id: true, name: true, status: true },
			orderBy: { name: 'asc' },
			take: 500,
		}),
		db.faction.findMany({
			where: { worldId: plot.worldId },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
			take: 500,
		}),
		db.character.findMany({
			where: { worldId: plot.worldId },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
			take: 500,
		}),
		db.plotQuest.findMany({
			where: { worldId: plot.worldId, id: { not: plotQuestId } },
			select: { id: true, title: true, status: true },
			orderBy: { title: 'asc' },
		}),
		// Linkable + already-linked system quests for QUEST_ACCEPTED picker
		(async () => {
			const linked = await db.plotQuestQuest.findMany({
				where: { plotQuestId },
				select: { questId: true },
			});
			const ids = linked.map(l => l.questId);
			if (!ids.length) return [] as Array<{ id: string; title: string; status: string }>;
			return db.quest.findMany({
				where: { id: { in: ids } },
				select: { id: true, title: true, status: true },
				orderBy: { title: 'asc' },
			});
		})(),
		// Plot-linked factions for Social encounter pickers
		(async () => {
			const links = await db.factionQuest.findMany({
				where: { plotQuestId },
				select: { factionId: true },
			});
			const ids = links.map(l => l.factionId);
			if (!ids.length) return [] as Array<{ id: string; name: string }>;
			return db.faction.findMany({
				where: { id: { in: ids } },
				select: { id: true, name: true },
				orderBy: { name: 'asc' },
			});
		})(),
		// Plot-linked NPCs for Social encounter pickers
		(async () => {
			const links = await db.npcQuest.findMany({
				where: { plotQuestId },
				select: { npcId: true },
			});
			const ids = links.map(l => l.npcId);
			if (!ids.length) return [] as Array<{ id: string; name: string; status: string }>;
			return db.npc.findMany({
				where: { id: { in: ids } },
				select: { id: true, name: true, status: true },
				orderBy: { name: 'asc' },
			});
		})(),
	]);

	const graphNodes: PlotGraphNode[] = nodes.map(n => ({
		id: n.id,
		plotQuestId: n.plotQuestId,
		parentNodeId: n.parentNodeId,
		kind: n.kind,
		title: n.title,
		objectiveTier: n.objectiveTier,
	}));
	const graphEdges: PlotGraphEdge[] = edges.map(e => ({
		id: e.id,
		plotQuestId: e.plotQuestId,
		fromNodeId: e.fromNodeId,
		toNodeId: e.toNodeId,
		toPlotQuestId: e.toPlotQuestId,
		kind: e.kind,
	}));
	const graphStates: PlotGraphState[] = nodes
		.filter(n => n.state)
		.map(n => ({ nodeId: n.id, status: n.state!.status }));
	const graphEntry: PlotGraphEntryReq[] = entryReqs.map(r => ({
		id: r.id,
		sceneNodeId: r.sceneNodeId,
		kind: r.kind as PlotEntryReqKind,
		payload: r.payload,
		label: r.label,
	}));

	const worldCtx = await buildEntryWorldContext(plot.worldId, entryReqs);
	const analysis = computeProgressionAnalysis(graphNodes, graphEdges, graphStates, graphEntry, worldCtx);

	const currentDay = calendar?.currentDay ?? 0;
	/** Plot-global fail timer = deadlineDay */
	const timeoutDue =
		plot.deadlineDay != null
		&& (plot.status === 'ACTIVE' || plot.status === 'DRAFT')
		&& currentDay >= plot.deadlineDay;

	const overdueNodeIds = nodes
		.filter(n =>
			(n.kind === 'SCENE' || n.kind === 'OBJECTIVE')
			&& n.failureTimeoutDay != null
			&& currentDay >= n.failureTimeoutDay
			&& n.state
			&& !['FAILED', 'COMPLETED', 'MISSED', 'BLOCKED'].includes(n.state.status),
		)
		.map(n => n.id);

	// Ensure neural placements exist, then attach flowchart positions for the plot editor
	try {
		const { syncProgressionLayer } = await import('../../write/world/neural-map.ts');
		await syncProgressionLayer(plot.worldId, { plotQuestId });
	} catch (err) {
		console.error('[getPlotProgression] syncProgressionLayer', plotQuestId, err);
	}

	const neuralPlaced = await db.neuralMapNode.findMany({
		where: {
			worldId: plot.worldId,
			entityType: 'PLOT_NODE',
			entityId: { in: nodes.map(n => n.id) },
		},
		select: { entityId: true, posX: true, posY: true },
	});
	const flowchartPositions: Record<string, { posX: number; posY: number }> = {};
	for (const n of neuralPlaced) {
		flowchartPositions[n.entityId] = { posX: n.posX, posY: n.posY };
	}

	return {
		plot,
		nodes,
		edges,
		entryReqs,
		analysis,
		timeoutDue,
		overdueNodeIds,
		currentDay,
		flowchartPositions,
		catalog: {
			npcs: worldNpcs,
			factions: worldFactions,
			characters: worldCharacters,
			otherPlots,
			quests: linkableQuests,
			plotFactions,
			plotNpcs,
			objectiveNodes: nodes
				.filter(n => n.kind === 'OBJECTIVE')
				.map(n => ({ id: n.id, title: n.title })),
			allNodes: nodes.map(n => ({ id: n.id, title: n.title, kind: n.kind })),
			scenes: nodes
				.filter(n => n.kind === 'SCENE')
				.map(n => ({ id: n.id, title: n.title })),
			endings: nodes
				.filter(n => n.kind === 'ENDING')
				.map(n => ({ id: n.id, title: n.title })),
		},
	};
}

const PLAYER_VISIBLE_STATUSES = new Set(['COMPLETED', 'FAILED', 'MISSED']);
const PLAYER_PLOT_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'FAILED']);

/** Player-facing plot list for a world (no draft spoilers). */
export async function listPlayerPlotQuests(worldId: string) {
	return db.plotQuest.findMany({
		where: { worldId, status: { in: ['ACTIVE', 'COMPLETED', 'FAILED'] } },
		select: {
			id: true,
			title: true,
			summary: true,
			status: true,
			deadlineDay: true,
			updatedAt: true,
		},
		orderBy: [{ status: 'asc' }, { title: 'asc' }],
	});
}

/**
 * Revealed playthrough log for players: terminal beats with playerNoteVisible.
 * No locked/available-only spoilers.
 */
export async function getPlotPlayLog(plotQuestId: string) {
	const plot = await db.plotQuest.findUnique({
		where: { id: plotQuestId },
		select: {
			id: true,
			worldId: true,
			title: true,
			summary: true,
			status: true,
			deadlineDay: true,
		},
	});
	if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
	if (!PLAYER_PLOT_STATUSES.has(plot.status)) {
		throw new NotFoundError('PlotQuest', plotQuestId);
	}

	const nodes = await db.plotNode.findMany({
		where: {
			plotQuestId,
			state: {
				status: { in: ['COMPLETED', 'FAILED', 'MISSED'] },
				playerNoteVisible: true,
			},
		},
		select: {
			id: true,
			kind: true,
			title: true,
			description: true,
			state: {
				select: {
					status: true,
					playerNote: true,
					updatedAt: true,
				},
			},
		},
		orderBy: [{ state: { updatedAt: 'asc' } }],
	});

	return {
		plot,
		beats: nodes
			.filter(n => n.state && PLAYER_VISIBLE_STATUSES.has(n.state.status))
			.map(n => ({
				id: n.id,
				kind: n.kind,
				title: n.title,
				description: n.description,
				status: n.state!.status,
				playerNote: n.state!.playerNote,
				updatedAt: n.state!.updatedAt,
			})),
	};
}

export async function listPlotQuestsBySystemQuest(questId: string) {
	const links = await db.plotQuestQuest.findMany({
		where: { questId },
		include: {
			plotQuest: {
				select: {
					id: true,
					worldId: true,
					title: true,
					status: true,
					summary: true,
					deadlineDay: true,
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	});
	return links.map(l => ({
		linkId: l.id,
		questId: l.questId,
		plotQuest: l.plotQuest,
	}));
}
