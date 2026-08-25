// shared/database/lib/plot-graph/engine.ts
import type {
	EntryReqWorldContext,
	PlotGraphEdge,
	PlotGraphEntryReq,
	PlotGraphNode,
	PlotGraphState,
	PlotNodeStatus,
	ProgressionAnalysis,
} from './types.ts';

const DONE: PlotNodeStatus[] = ['COMPLETED'];
const TERMINAL_BAD: PlotNodeStatus[] = ['FAILED', 'MISSED', 'BLOCKED'];

function statusMap(states: PlotGraphState[]): Map<string, PlotNodeStatus> {
	const m = new Map<string, PlotNodeStatus>();
	for (const s of states) m.set(s.nodeId, s.status);
	return m;
}

function isDone(status: PlotNodeStatus | undefined): boolean {
	return status != null && DONE.includes(status);
}

function payloadObj(payload: unknown): Record<string, unknown> {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		return payload as Record<string, unknown>;
	}
	return {};
}

/** Evaluate one entry requirement against node states + world facts. */
export function evaluateEntryRequirement(
	req: PlotGraphEntryReq,
	st: Map<string, PlotNodeStatus>,
	byId: Map<string, PlotGraphNode>,
	world: EntryReqWorldContext,
): { ok: boolean; permanentFail: boolean } {
	const p = payloadObj(req.payload);
	switch (req.kind) {
		case 'QUEST_ACCEPTED': {
			const questId = String(p.questId ?? '');
			if (!questId) return { ok: false, permanentFail: false };
			return { ok: !!world.questAccepted[questId], permanentFail: false };
		}
		case 'NPC_ALIVE': {
			const npcId = String(p.npcId ?? '');
			if (!npcId) return { ok: false, permanentFail: false };
			const status = world.npcStatus[npcId];
			if (status == null) return { ok: false, permanentFail: false };
			if (status === 'ALIVE') return { ok: true, permanentFail: false };
			// Dead / missing / imprisoned / exiled — cannot satisfy NPC_ALIVE later
			return { ok: false, permanentFail: true };
		}
		case 'NODE_COMPLETED':
		case 'OBJECTIVE_COMPLETE': {
			const nodeId = String(p.nodeId ?? '');
			if (!nodeId) return { ok: false, permanentFail: false };
			if (req.kind === 'OBJECTIVE_COMPLETE') {
				const n = byId.get(nodeId);
				if (n && n.kind !== 'OBJECTIVE') return { ok: false, permanentFail: false };
			}
			if (isDone(st.get(nodeId))) return { ok: true, permanentFail: false };
			const s = st.get(nodeId);
			if (s && TERMINAL_BAD.includes(s)) return { ok: false, permanentFail: true };
			return { ok: false, permanentFail: false };
		}
		case 'CUSTOM':
			// Authoring note only — does not auto-gate
			return { ok: true, permanentFail: false };
		default:
			return { ok: false, permanentFail: false };
	}
}

/** Same-plot edges only (ignore cross-plot targets for cycle check). */
export function assertAcyclic(nodes: PlotGraphNode[], edges: PlotGraphEdge[]): string | null {
	const ids = new Set(nodes.map(n => n.id));
	const adj = new Map<string, string[]>();
	for (const id of ids) adj.set(id, []);
	for (const e of edges) {
		if (!e.toNodeId) continue;
		if (!ids.has(e.fromNodeId) || !ids.has(e.toNodeId)) continue;
		adj.get(e.fromNodeId)!.push(e.toNodeId);
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();

	function dfs(id: string): boolean {
		if (visiting.has(id)) return true;
		if (visited.has(id)) return false;
		visiting.add(id);
		for (const next of adj.get(id) ?? []) {
			if (dfs(next)) return true;
		}
		visiting.delete(id);
		visited.add(id);
		return false;
	}

	for (const id of ids) {
		if (dfs(id)) return 'Progression graph must be acyclic (cycle detected).';
	}
	return null;
}

/** World-level PlotQuest unlock/block edges (fromNode belongs to source plot). */
export function assertPlotUnlockAcyclic(
	edges: Array<{ fromPlotQuestId: string; toPlotQuestId: string }>,
): string | null {
	const adj = new Map<string, string[]>();
	for (const e of edges) {
		if (!adj.has(e.fromPlotQuestId)) adj.set(e.fromPlotQuestId, []);
		adj.get(e.fromPlotQuestId)!.push(e.toPlotQuestId);
		if (!adj.has(e.toPlotQuestId)) adj.set(e.toPlotQuestId, []);
	}
	const visiting = new Set<string>();
	const visited = new Set<string>();
	function dfs(id: string): boolean {
		if (visiting.has(id)) return true;
		if (visited.has(id)) return false;
		visiting.add(id);
		for (const next of adj.get(id) ?? []) {
			if (dfs(next)) return true;
		}
		visiting.delete(id);
		visited.add(id);
		return false;
	}
	for (const id of adj.keys()) {
		if (dfs(id)) return 'Plot-quest unlock graph must be acyclic.';
	}
	return null;
}

/**
 * Derive progression analysis from authored graph + DM-persisted states + entry reqs.
 * Persisted BLOCKED/FAILED/MISSED/COMPLETED win; otherwise compute availability.
 */
export function computeProgressionAnalysis(
	nodes: PlotGraphNode[],
	edges: PlotGraphEdge[],
	states: PlotGraphState[],
	entryReqs: PlotGraphEntryReq[] = [],
	world: EntryReqWorldContext = { questAccepted: {}, npcStatus: {} },
): ProgressionAnalysis {
	const byId = new Map(nodes.map(n => [n.id, n]));
	const st = statusMap(states);

	const requiresOf = new Map<string, string[]>(); // target -> sources that must be done
	const unlockedBy = new Map<string, string[]>(); // target -> sources that unlock it
	const blockedBy = new Map<string, string[]>(); // target -> sources that block it when done

	const unlockedPlotQuestIds = new Set<string>();
	const lockedPlotQuestIds = new Set<string>();

	for (const e of edges) {
		if (e.toPlotQuestId) {
			if (e.kind === 'UNLOCKS' && isDone(st.get(e.fromNodeId))) {
				unlockedPlotQuestIds.add(e.toPlotQuestId);
			}
			if (e.kind === 'BLOCKS' && isDone(st.get(e.fromNodeId))) {
				lockedPlotQuestIds.add(e.toPlotQuestId);
			}
			continue;
		}
		if (!e.toNodeId) continue;
		if (e.kind === 'REQUIRES') {
			const list = requiresOf.get(e.toNodeId) ?? [];
			list.push(e.fromNodeId);
			requiresOf.set(e.toNodeId, list);
		} else if (e.kind === 'UNLOCKS') {
			const list = unlockedBy.get(e.toNodeId) ?? [];
			list.push(e.fromNodeId);
			unlockedBy.set(e.toNodeId, list);
		} else if (e.kind === 'BLOCKS') {
			const list = blockedBy.get(e.toNodeId) ?? [];
			list.push(e.fromNodeId);
			blockedBy.set(e.toNodeId, list);
		}
	}

	const impossible = new Set<string>();
	const available = new Set<string>();
	const entryBlockedScenes = new Set<string>();
	const unmetEntryReqIds: string[] = [];

	function markImpossible(id: string) {
		if (impossible.has(id)) return;
		impossible.add(id);
	}

	// Entry requirements per scene
	const entryByScene = new Map<string, PlotGraphEntryReq[]>();
	for (const req of entryReqs) {
		const list = entryByScene.get(req.sceneNodeId) ?? [];
		list.push(req);
		entryByScene.set(req.sceneNodeId, list);
	}

	const sceneEntryOk = new Map<string, boolean>(); // sceneId -> all entry reqs satisfied
	for (const [sceneId, reqs] of entryByScene) {
		let allOk = true;
		let permanent = false;
		for (const req of reqs) {
			const result = evaluateEntryRequirement(req, st, byId, world);
			if (!result.ok) {
				allOk = false;
				unmetEntryReqIds.push(req.id);
				if (result.permanentFail) permanent = true;
			}
		}
		sceneEntryOk.set(sceneId, allOk);
		if (permanent) markImpossible(sceneId);
		else if (!allOk) entryBlockedScenes.add(sceneId);
	}

	// Pass 1: explicit terminal bad + blocked by completed BLOCKS
	for (const n of nodes) {
		const s = st.get(n.id);
		if (s && TERMINAL_BAD.includes(s)) markImpossible(n.id);
		const blockers = blockedBy.get(n.id) ?? [];
		if (blockers.some(b => isDone(st.get(b)))) markImpossible(n.id);
	}

	// Pass 2: propagate impossibility through REQUIRES
	let changed = true;
	while (changed) {
		changed = false;
		for (const n of nodes) {
			if (impossible.has(n.id)) continue;
			const reqs = requiresOf.get(n.id) ?? [];
			if (reqs.length && reqs.every(r => impossible.has(r))) {
				markImpossible(n.id);
				changed = true;
			}
		}
	}

	// If a scene is impossible via entry, children that REQUIRE it also become impossible (covered by REQUIRES pass if wired).
	// Also: discoveries/decisions under an impossible scene with no alternate path — mark children impossible when parent scene is impossible.
	changed = true;
	while (changed) {
		changed = false;
		for (const n of nodes) {
			if (impossible.has(n.id) || !n.parentNodeId) continue;
			if (impossible.has(n.parentNodeId)) {
				markImpossible(n.id);
				changed = true;
			}
		}
	}

	function requiresSatisfied(id: string): boolean {
		const reqs = requiresOf.get(id) ?? [];
		return reqs.every(r => isDone(st.get(r)));
	}

	function unlockSatisfied(id: string): boolean {
		const unlockers = unlockedBy.get(id) ?? [];
		if (!unlockers.length) return true;
		return unlockers.some(u => isDone(st.get(u)));
	}

	function entrySatisfied(id: string): boolean {
		if (!entryByScene.has(id)) return true;
		return sceneEntryOk.get(id) === true;
	}

	const PLAYABLE: PlotNodeStatus[] = ['AVAILABLE', 'ACTIVE'];
	const DONE_OR_BAD = new Set<PlotNodeStatus>(['COMPLETED', ...TERMINAL_BAD]);

	for (const n of nodes) {
		const s = st.get(n.id);
		if (impossible.has(n.id)) continue;
		if (s && DONE_OR_BAD.has(s)) continue; // completed / failed / missed / blocked — not open for play

		if (n.kind === 'SCENE' && !entrySatisfied(n.id)) {
			entryBlockedScenes.add(n.id);
			continue;
		}

		// Already opened by DM / create defaults
		if (s && PLAYABLE.includes(s)) {
			available.add(n.id);
			continue;
		}

		// LOCKED (or unset): only open when graph gates are satisfied (never treat ungated LOCKED as available)
		const needsUnlock = (unlockedBy.get(n.id) ?? []).length > 0;
		const hasGates =
			(requiresOf.get(n.id) ?? []).length > 0 || needsUnlock;
		if (!hasGates) continue;

		const entryOk = requiresSatisfied(n.id) && (!needsUnlock || unlockSatisfied(n.id));
		if (entryOk) available.add(n.id);
	}

	const missedDiscoveryIds = nodes
		.filter(n => n.kind === 'DISCOVERY')
		.filter(n => {
			const s = st.get(n.id);
			if (s === 'MISSED') return true;
			if (s === 'COMPLETED') return false;
			return impossible.has(n.id);
		})
		.map(n => n.id);

	const endings = nodes.filter(n => n.kind === 'ENDING');
	const possibleEndingIds = endings
		.filter(n => !impossible.has(n.id) && st.get(n.id) !== 'FAILED')
		.filter(n => available.has(n.id) || isDone(st.get(n.id)) || !(unlockedBy.get(n.id) ?? []).length || unlockSatisfied(n.id))
		.filter(n => requiresSatisfied(n.id) || isDone(st.get(n.id)))
		.map(n => n.id);

	const blockedEndingIds = endings.filter(n => impossible.has(n.id)).map(n => n.id);

	const availableSceneIds = nodes
		.filter(n => n.kind === 'SCENE' && available.has(n.id) && !impossible.has(n.id) && !entryBlockedScenes.has(n.id))
		.map(n => n.id);

	return {
		availableSceneIds,
		availableNodeIds: [...available],
		impossibleNodeIds: [...impossible],
		entryBlockedSceneIds: [...entryBlockedScenes],
		unmetEntryReqIds,
		missedDiscoveryIds,
		possibleEndingIds,
		blockedEndingIds,
		unlockedPlotQuestIds: [...unlockedPlotQuestIds],
		lockedPlotQuestIds: [...lockedPlotQuestIds],
	};
}

export type { PlotGraphNode, PlotGraphEdge, PlotGraphState, ProgressionAnalysis };
