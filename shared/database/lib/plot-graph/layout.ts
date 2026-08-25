// shared/database/lib/plot-graph/layout.ts
/** Left-to-right layered layout for plot progression nodes (flowchart feel). */

export type LayoutNodeIn = {
	id: string;
	parentNodeId: string | null;
	kind: string;
	sortOrder: number;
	title: string;
};

export type LayoutEdgeIn = {
	fromNodeId: string;
	toNodeId: string | null;
	kind: string;
};

export type LayoutPoint = { posX: number; posY: number };

const KIND_BAND: Record<string, number> = {
	OBJECTIVE: 0,
	FAILURE_CONDITION: 1,
	SCENE: 2,
	DISCOVERY: 3,
	ENCOUNTER: 3,
	DECISION: 4,
	DECISION_OPTION: 5,
	EXIT: 6,
	ENDING: 7,
};

const COL_GAP = 180;
const ROW_GAP = 90;
const PLOT_BAND_H = 520;
const PLOTS_PER_ROW = 2;
const PLOT_COL_W = 720;

function kindBand(kind: string): number {
	return KIND_BAND[kind] ?? 50;
}

/**
 * Assign each node a depth column using parent tree + REQUIRES/UNLOCKS edges.
 * Roots (no parent, or objectives/scenes/endings at top) start at depth 0–1.
 */
function computeDepths(nodes: LayoutNodeIn[], edges: LayoutEdgeIn[]): Map<string, number> {
	const byId = new Map(nodes.map(n => [n.id, n]));
	const depths = new Map<string, number>();
	const kids = new Map<string, string[]>();

	for (const n of nodes) {
		if (n.parentNodeId && byId.has(n.parentNodeId)) {
			const list = kids.get(n.parentNodeId) ?? [];
			list.push(n.id);
			kids.set(n.parentNodeId, list);
		}
	}

	// Seed: roots by kind band (objectives/failures left, scenes mid, endings right-ish)
	for (const n of nodes) {
		if (!n.parentNodeId || !byId.has(n.parentNodeId)) {
			if (n.kind === 'OBJECTIVE' || n.kind === 'FAILURE_CONDITION') depths.set(n.id, 0);
			else if (n.kind === 'ENDING') depths.set(n.id, 3);
			else depths.set(n.id, 1);
		}
	}

	// Parent-tree: children are parentDepth + 1
	let changed = true;
	let guard = 0;
	while (changed && guard++ < nodes.length + 2) {
		changed = false;
		for (const n of nodes) {
			if (!n.parentNodeId) continue;
			const pd = depths.get(n.parentNodeId);
			if (pd == null) continue;
			const want = pd + 1;
			const cur = depths.get(n.id);
			if (cur == null || want > cur) {
				depths.set(n.id, want);
				changed = true;
			}
		}
	}

	// Graph edges push targets to the right of sources
	for (const e of edges) {
		if (!e.toNodeId || !byId.has(e.fromNodeId) || !byId.has(e.toNodeId)) continue;
		if (e.kind !== 'REQUIRES' && e.kind !== 'UNLOCKS' && e.kind !== 'BLOCKS') continue;
		const fd = depths.get(e.fromNodeId) ?? 1;
		const want = fd + 1;
		const cur = depths.get(e.toNodeId);
		if (cur == null || want > cur) depths.set(e.toNodeId, want);
	}

	// Stabilize with a few more parent/edge passes
	for (let i = 0; i < 4; i++) {
		for (const n of nodes) {
			if (n.parentNodeId) {
				const pd = depths.get(n.parentNodeId);
				if (pd != null) {
					const want = pd + 1;
					if ((depths.get(n.id) ?? 0) < want) depths.set(n.id, want);
				}
			}
		}
		for (const e of edges) {
			if (!e.toNodeId) continue;
			const fd = depths.get(e.fromNodeId);
			if (fd == null) continue;
			const want = fd + 1;
			if ((depths.get(e.toNodeId) ?? 0) < want) depths.set(e.toNodeId, want);
		}
	}

	for (const n of nodes) {
		if (!depths.has(n.id)) depths.set(n.id, kindBand(n.kind) <= 1 ? 0 : 1);
	}

	return depths;
}

/**
 * Layout one plot's nodes left→right by depth, top→bottom by kind/sortOrder.
 * `plotIndex` offsets the whole plot on a world board; use 0 for single-plot flowchart.
 */
export function layoutPlotFlowchart(
	plotIndex: number,
	nodes: LayoutNodeIn[],
	edges: LayoutEdgeIn[] = [],
): Map<string, LayoutPoint> {
	const pos = new Map<string, LayoutPoint>();
	if (!nodes.length) return pos;

	const depths = computeDepths(nodes, edges);
	const byDepth = new Map<number, LayoutNodeIn[]>();
	for (const n of nodes) {
		const d = depths.get(n.id) ?? 1;
		const list = byDepth.get(d) ?? [];
		list.push(n);
		byDepth.set(d, list);
	}
	for (const list of byDepth.values()) {
		list.sort(
			(a, b) =>
				kindBand(a.kind) - kindBand(b.kind)
				|| a.sortOrder - b.sortOrder
				|| a.title.localeCompare(b.title),
		);
	}

	const originX = 80 + (plotIndex % PLOTS_PER_ROW) * PLOT_COL_W;
	const originY = 60 + Math.floor(plotIndex / PLOTS_PER_ROW) * PLOT_BAND_H;

	const depthKeys = [...byDepth.keys()].sort((a, b) => a - b);
	for (const d of depthKeys) {
		const col = depthKeys.indexOf(d);
		const list = byDepth.get(d)!;
		list.forEach((n, row) => {
			pos.set(n.id, {
				posX: originX + col * COL_GAP,
				posY: originY + row * ROW_GAP,
			});
		});
	}

	return pos;
}
