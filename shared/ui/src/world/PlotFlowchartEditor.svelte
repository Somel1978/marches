<!-- shared/ui/src/world/PlotFlowchartEditor.svelte -->
<!-- Two-layer Progression: Scene graph (layer 1) + Scene flow with Start Node (layer 2). -->
<script lang="ts">
	import { untrack } from 'svelte';
	import FantasyDateField from './FantasyDateField.svelte';
	import type { CalendarDef } from './calendar-types.ts';
	import { confirmModal } from '../../components/ui/confirm-modal-singleton.ts';

	type PlotNode = {
		id: string;
		kind: string;
		title: string;
		description?: string | null;
		parentNodeId?: string | null;
		failureTimeoutDay?: number | null;
		sortOrder?: number;
		encounterKind?: string | null;
		socialFactionId?: string | null;
		socialNpcId?: string | null;
		state?: {
			status?: string;
			note?: string | null;
			playerNote?: string | null;
			updatedAt?: string | Date;
		} | null;
		effects?: any[];
	};

	type FlowEdge = {
		id: string;
		kind: string;
		fromNodeId: string;
		toNodeId: string | null;
		toPlotQuestId?: string | null;
		label?: string | null;
	};

	type EntryReq = {
		id: string;
		sceneNodeId: string;
		kind: string;
		label?: string | null;
		payload?: any;
	};

	/** Canvas card — graph cards or flow pieces (Start uses the SCENE id). */
	type BoardCard = {
		id: string;
		role: 'START' | 'SCENE' | 'ENDING' | 'DISCOVERY' | 'ENCOUNTER' | 'DECISION' | 'DECISION_OPTION' | 'EXIT' | 'GHOST';
		posX: number;
		posY: number;
		node: PlotNode;
		ghostLabel?: string;
	};

	const STATUS_LABELS: Record<string, string> = {
		LOCKED: 'Locked', AVAILABLE: 'Available', ACTIVE: 'Active',
		COMPLETED: 'Completed', FAILED: 'Failed', MISSED: 'Missed', BLOCKED: 'Blocked',
	};

	const EDGE_KINDS = [
		{ value: 'UNLOCKS', label: 'Unlocks' },
		{ value: 'BLOCKS', label: 'Blocks' },
		{ value: 'REQUIRES', label: 'Needs' },
	] as const;

	const ENTRY_OPTS = [
		{ value: 'QUEST_ACCEPTED', label: 'Quest accepted' },
		{ value: 'NPC_ALIVE', label: 'NPC alive' },
		{ value: 'NODE_COMPLETED', label: 'Node completed' },
		{ value: 'OBJECTIVE_COMPLETE', label: 'Objective complete' },
		{ value: 'CUSTOM', label: 'Custom note' },
	] as const;

	const EFFECT_OPTS = [
		{ value: 'REPUTATION', label: 'Reputation' },
		{ value: 'NPC_FLAG', label: 'NPC status' },
		{ value: 'LOCK_PLOT_QUEST', label: 'Lock follow-up plot' },
		{ value: 'CUSTOM', label: 'Custom' },
	] as const;

	const NPC_STATUS_OPTS = [
		{ value: 'ALIVE', label: 'Alive' },
		{ value: 'DEAD', label: 'Dead' },
		{ value: 'MISSING', label: 'Missing' },
		{ value: 'IMPRISONED', label: 'Imprisoned' },
		{ value: 'EXILED', label: 'Exiled' },
	] as const;

	const EFFECT_KINDS = new Set(['DISCOVERY', 'ENCOUNTER', 'DECISION_OPTION', 'EXIT', 'ENDING', 'SCENE']);
	const LINK_KINDS = new Set(['DISCOVERY', 'ENCOUNTER', 'DECISION', 'DECISION_OPTION', 'EXIT', 'ENDING', 'SCENE']);

	const ENCOUNTER_OPTS = [
		{ value: 'COMBAT', label: 'Combat' },
		{ value: 'PUZZLE', label: 'Puzzles' },
		{ value: 'TRAP', label: 'Traps' },
		{ value: 'SOCIAL', label: 'Social' },
	] as const;

	const COMPLETION_EDGE_OPTS = [
		{ value: 'UNLOCKS', label: 'Unlocks' },
		{ value: 'BLOCKS', label: 'Blocks' },
	] as const;

	let {
		nodes = [],
		edges = [],
		entryReqs = [],
		positions = {},
		calendar,
		catalog = {
			npcs: [], quests: [], objectiveNodes: [], allNodes: [],
			factions: [], characters: [], otherPlots: [], plotFactions: [], plotNpcs: [],
		},
		canEdit = false,
		busy = false,
		/** Play tab: select pieces and set Taken/Closed/status; no structure edit. */
		playMode = false,
		analysis = null,
		onCreateNode,
		onUpdateNode,
		onDeleteNode,
		onSetStatus,
		onCreateEdge,
		onDeleteEdge,
		onMoveNode,
		onRelayout,
		onCreateEntry,
		onDeleteEntry,
		onCreateEffect,
		onDeleteEffect,
		onAdvanceNode,
		onRevertNode,
		onSetCurrent,
	}: {
		nodes?: any[];
		edges?: any[];
		entryReqs?: EntryReq[];
		positions?: Record<string, { posX: number; posY: number }>;
		calendar: CalendarDef;
		catalog?: {
			npcs: Array<{ id: string; name: string }>;
			quests: Array<{ id: string; title: string }>;
			objectiveNodes: Array<{ id: string; title: string }>;
			allNodes: Array<{ id: string; title: string; kind: string }>;
			factions?: Array<{ id: string; name: string }>;
			characters?: Array<{ id: string; name: string }>;
			otherPlots?: Array<{ id: string; title: string; status: string }>;
			plotFactions?: Array<{ id: string; name: string }>;
			plotNpcs?: Array<{ id: string; name: string; status?: string }>;
		};
		canEdit?: boolean;
		busy?: boolean;
		playMode?: boolean;
		analysis?: {
			availableNodeIds?: string[];
			availableSceneIds?: string[];
		} | null;
		onCreateNode?: (input: {
			kind: string;
			title: string;
			parentNodeId?: string | null;
			description?: string;
			encounterKind?: string | null;
			socialFactionId?: string | null;
			socialNpcId?: string | null;
		}) => Promise<void> | void;
		onUpdateNode?: (input: Record<string, string | number | null | undefined>) => Promise<void> | void;
		onDeleteNode?: (nodeId: string) => Promise<void> | void;
		onSetStatus?: (nodeId: string, status: string) => Promise<void> | void;
		onCreateEdge?: (input: {
			kind: string;
			fromNodeId: string;
			toNodeId?: string | null;
			toPlotQuestId?: string | null;
		}) => Promise<void> | void;
		onDeleteEdge?: (edgeId: string) => Promise<void> | void;
		onMoveNode?: (nodeId: string, pos: { posX: number; posY: number }) => Promise<void> | void;
		onRelayout?: () => Promise<void> | void;
		onCreateEntry?: (input: Record<string, string>) => Promise<void> | void;
		onDeleteEntry?: (id: string) => Promise<void> | void;
		onCreateEffect?: (input: Record<string, string>) => Promise<void> | void;
		onDeleteEffect?: (id: string) => Promise<void> | void;
		onAdvanceNode?: (input: {
			nodeId: string;
			status: string;
			note?: string;
			playerNote?: string;
			playerNoteVisible?: boolean;
			missSiblingIds?: string[];
		}) => Promise<void> | void;
		onRevertNode?: (nodeId: string) => Promise<void> | void;
		/** Move sole Current marker to this node (does not clear Taken history). */
		onSetCurrent?: (nodeId: string) => Promise<void> | void;
	} = $props();

	const structureEdit = $derived(canEdit && !playMode);
	/** Reposition cards whenever move is wired (Progression + Play); includes out-of-scene ghosts. */
	const canDragNodes = $derived(canEdit && !!onMoveNode);
	const availableIds = $derived(new Set([
		...(analysis?.availableNodeIds ?? []),
		...(analysis?.availableSceneIds ?? []),
	]));

	const factions = $derived(catalog.factions ?? []);
	const characters = $derived(catalog.characters ?? []);
	const otherPlots = $derived(catalog.otherPlots ?? []);
	const plotFactions = $derived(catalog.plotFactions ?? []);
	const plotNpcs = $derived(catalog.plotNpcs ?? []);

	const allNodes = $derived((nodes ?? []) as PlotNode[]);
	const byId = $derived(new Map(allNodes.map(n => [n.id, n])));

	const scenes = $derived(
		allNodes
			.filter(n => n.kind === 'SCENE')
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title)),
	);
	const endings = $derived(
		allNodes
			.filter(n => n.kind === 'ENDING')
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title)),
	);
	const objectives = $derived(allNodes.filter(n => n.kind === 'OBJECTIVE'));

	function childrenOf(parentId: string, kind?: string) {
		return allNodes
			.filter(n => n.parentNodeId === parentId && (!kind || n.kind === kind))
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title));
	}

	function sceneBundle(sceneId: string) {
		const discoveries = childrenOf(sceneId, 'DISCOVERY');
		const encounters = childrenOf(sceneId, 'ENCOUNTER');
		const decisions = childrenOf(sceneId, 'DECISION').map(d => ({
			...d,
			options: childrenOf(d.id, 'DECISION_OPTION'),
		}));
		const exits = childrenOf(sceneId, 'EXIT');
		const entry = entryReqs.filter(r => r.sceneNodeId === sceneId);
		return { discoveries, encounters, decisions, exits, entry };
	}

	function encounterLabel(kind: string | null | undefined): string {
		return ENCOUNTER_OPTS.find(o => o.value === kind)?.label ?? (kind || 'Encounter');
	}

	function scenePieceIds(sceneId: string): Set<string> {
		const ids = new Set<string>([sceneId]);
		for (const n of allNodes) {
			if (n.parentNodeId === sceneId) {
				ids.add(n.id);
				for (const opt of childrenOf(n.id, 'DECISION_OPTION')) ids.add(opt.id);
			}
		}
		return ids;
	}

	/** Walk up to owning SCENE or ENDING for graph-layer edge geometry. */
	function graphCardIdFor(nodeId: string): string | null {
		let cur = byId.get(nodeId);
		if (!cur) return null;
		if (cur.kind === 'SCENE' || cur.kind === 'ENDING') return cur.id;
		if (cur.kind === 'DECISION_OPTION' && cur.parentNodeId) {
			const dec = byId.get(cur.parentNodeId);
			return dec?.parentNodeId ?? null;
		}
		if (cur.parentNodeId) {
			const p = byId.get(cur.parentNodeId);
			if (p?.kind === 'SCENE') return p.id;
			if (p?.kind === 'DECISION') return p.parentNodeId ?? null;
		}
		return null;
	}

	let view = $state<'graph' | 'flow'>('graph');
	let flowSceneId = $state<string | null>(null);
	/** In flow mode, selecting Start focuses the scene as Start Node (not flat piece list). */
	let focusStart = $state(false);

	const flowScene = $derived(flowSceneId ? byId.get(flowSceneId) ?? null : null);
	const flowBundle = $derived(flowSceneId ? sceneBundle(flowSceneId) : null);

	function openFlow(sceneId: string) {
		view = 'flow';
		flowSceneId = sceneId;
		focusStart = true;
		selectedCardId = sceneId;
		selectedPieceId = null;
		selectedEdgeId = null;
		mode = 'select';
		connectFromId = null;
		fittedKey = '';
	}

	function backToGraph() {
		view = 'graph';
		flowSceneId = null;
		focusStart = false;
		selectedPieceId = null;
		selectedEdgeId = null;
		mode = 'select';
		connectFromId = null;
		fittedKey = '';
	}

	/** UNLOCKS → OBJECTIVE = Finish (resolve), not a path jump on the board. */
	function isFinishObjectiveEdge(e: FlowEdge): boolean {
		if (e.kind !== 'UNLOCKS' || !e.toNodeId) return false;
		return byId.get(e.toNodeId)?.kind === 'OBJECTIVE';
	}

	/** Path unlock destinations only (scenes, endings, pieces) — not Finish-objective. */
	function pathDestLabel(fromNodeId: string): string {
		const unlocks = (edges ?? []).filter((e: FlowEdge) =>
			e.fromNodeId === fromNodeId && e.kind === 'UNLOCKS' && e.toNodeId && !isFinishObjectiveEdge(e));
		if (!unlocks.length) return '';
		return unlocks
			.map((e: FlowEdge) => byId.get(e.toNodeId!)?.title ?? '…')
			.join(', ');
	}

	function finishLabels(fromNodeId: string): string {
		const finishes = (edges ?? []).filter((e: FlowEdge) =>
			e.fromNodeId === fromNodeId && isFinishObjectiveEdge(e));
		if (!finishes.length) return '';
		return finishes
			.map((e: FlowEdge) => byId.get(e.toNodeId!)?.title ?? '…')
			.join(', ');
	}

	function exitDestLabel(exitId: string): string {
		return pathDestLabel(exitId);
	}

	const graphCards = $derived.by((): BoardCard[] => {
		const out: BoardCard[] = [];
		scenes.forEach((s, i) => {
			const p = positions[s.id];
			out.push({
				id: s.id,
				role: 'SCENE',
				posX: p?.posX ?? 48 + (i % 3) * 280,
				posY: p?.posY ?? 48 + Math.floor(i / 3) * 200,
				node: s,
			});
		});
		endings.forEach((e, i) => {
			const p = positions[e.id];
			out.push({
				id: e.id,
				role: 'ENDING',
				posX: p?.posX ?? 48 + (i % 3) * 280,
				posY: p?.posY ?? 48 + Math.max(1, Math.ceil(scenes.length / 3)) * 200 + i * 140,
				node: e,
			});
		});
		return out;
	});

	const flowCards = $derived.by((): BoardCard[] => {
		if (!flowSceneId || !flowScene) return [];
		const bundle = sceneBundle(flowSceneId);
		const out: BoardCard[] = [];
		const startPos = positions[flowSceneId];
		out.push({
			id: flowSceneId,
			role: 'START',
			posX: startPos?.posX ?? 40,
			posY: startPos?.posY ?? 120,
			node: flowScene,
		});

		bundle.discoveries.forEach((d, i) => {
			const p = positions[d.id];
			out.push({
				id: d.id,
				role: 'DISCOVERY',
				posX: p?.posX ?? 260,
				posY: p?.posY ?? 40 + i * 110,
				node: d,
			});
		});

		bundle.encounters.forEach((enc, i) => {
			const p = positions[enc.id];
			out.push({
				id: enc.id,
				role: 'ENCOUNTER',
				posX: p?.posX ?? 260,
				posY: p?.posY ?? 40 + (bundle.discoveries.length + i) * 110,
				node: enc,
			});
		});

		let decY = 40;
		bundle.decisions.forEach((d) => {
			const p = positions[d.id];
			out.push({
				id: d.id,
				role: 'DECISION',
				posX: p?.posX ?? 480,
				posY: p?.posY ?? decY,
				node: d,
			});
			d.options.forEach((opt, oi) => {
				const op = positions[opt.id];
				out.push({
					id: opt.id,
					role: 'DECISION_OPTION',
					posX: op?.posX ?? 700,
					posY: op?.posY ?? decY + oi * 90,
					node: opt,
				});
			});
			decY += Math.max(110, 40 + d.options.length * 90);
		});

		bundle.exits.forEach((x, i) => {
			const p = positions[x.id];
			out.push({
				id: x.id,
				role: 'EXIT',
				posX: p?.posX ?? 920,
				posY: p?.posY ?? 40 + i * 110,
				node: x,
			});
		});

		// Ghost targets outside this scene (for drawn outbound edges).
		// Finish-objective (UNLOCKS → OBJECTIVE) is card-only — no objective ghost.
		const pieceIds = scenePieceIds(flowSceneId);
		const ghostIds = new Set<string>();
		for (const e of (edges ?? []) as FlowEdge[]) {
			if (!e.toNodeId) continue;
			// Never ghost a deleted endpoint
			if (!byId.has(e.fromNodeId) || !byId.has(e.toNodeId)) continue;
			const fromIn = pieceIds.has(e.fromNodeId);
			const toIn = pieceIds.has(e.toNodeId);
			if (fromIn && !toIn) {
				if (isFinishObjectiveEdge(e)) continue;
				ghostIds.add(e.toNodeId);
			}
			if (toIn && !fromIn) {
				// Inbound from an objective Finish edge — still skip objective as ghost source clutter
				if (e.kind === 'UNLOCKS' && byId.get(e.fromNodeId)?.kind === 'OBJECTIVE') continue;
				ghostIds.add(e.fromNodeId);
			}
		}
		let gi = 0;
		for (const gid of ghostIds) {
			const n = byId.get(gid);
			if (!n) continue;
			const p = positions[gid];
			out.push({
				id: gid,
				role: 'GHOST',
				posX: p?.posX ?? 1140,
				posY: p?.posY ?? 40 + gi * 90,
				node: n,
				ghostLabel: `${kindLabel(n.kind)}: ${n.title}`,
			});
			gi++;
		}
		return out;
	});

	const boardCards = $derived(view === 'flow' ? flowCards : graphCards);
	/** Ids/roles/positions only — not titles (avoids remounting canvas while typing in inspector). */
	const boardCardsKey = $derived(
		boardCards.map(c => `${c.id}:${c.role}:${Math.round(c.posX)}:${Math.round(c.posY)}`).join('|'),
	);

	let mode = $state<'select' | 'connect'>('select');
	let edgeKind = $state<'UNLOCKS' | 'BLOCKS' | 'REQUIRES'>('UNLOCKS');
	let connectFromId = $state<string | null>(null);
	let selectedCardId = $state<string | null>(null);
	let selectedPieceId = $state<string | null>(null);
	let selectedEdgeId = $state<string | null>(null);

	let panX = $state(24);
	let panY = $state(24);
	let zoom = $state(1);
	let boardEl = $state<HTMLDivElement | null>(null);
	let panning = false;
	let panStart = { x: 0, y: 0, panX: 0, panY: 0 };
	let draggingId = $state<string | null>(null);
	let dragOffset = { x: 0, y: 0 };
	let dragOrigin = { x: 0, y: 0 };
	let dragMoved = false;
	const DRAG_THRESHOLD_PX = 4;

	let sceneTitle = $state('');
	let endingTitle = $state('');
	let inspectorTitle = $state('');
	let inspectorDesc = $state('');
	/** Which node the inspector draft fields were loaded for */
	let inspectorFocusId = $state<string | null>(null);
	let childTitle = $state('');
	let newEncounterKind = $state<'COMBAT' | 'PUZZLE' | 'TRAP' | 'SOCIAL'>('COMBAT');
	let newEncounterFactionId = $state('');
	let newEncounterNpcId = $state('');
	let optionTitle = $state('');
	let optionForDecisionId = $state('');

	let localCards = $state<BoardCard[]>([]);
	$effect(() => {
		void boardCardsKey;
		const next = boardCards.map(c => ({ ...c }));
		const dragId = untrack(() => draggingId);
		if (dragId) {
			const live = untrack(() => localCards.find(c => c.id === dragId));
			if (live && next.some(c => c.id === dragId)) {
				localCards = next.map(c =>
					c.id === dragId ? { ...c, posX: live.posX, posY: live.posY } : c,
				);
				return;
			}
			draggingId = null;
		}
		localCards = next;
	});

	const cardById = $derived(Object.fromEntries(localCards.map(c => [c.id, c])));

	const logicEdges = $derived.by((): FlowEdge[] => {
		const list = (edges ?? []) as FlowEdge[];
		if (view === 'graph') {
			return list.filter(e => {
				if (!e.toNodeId) return false;
				if (!byId.has(e.fromNodeId) || !byId.has(e.toNodeId)) return false;
				const fromCard = graphCardIdFor(e.fromNodeId);
				const toCard = graphCardIdFor(e.toNodeId);
				return !!fromCard && !!toCard && fromCard !== toCard;
			});
		}
		if (!flowSceneId) return [];
		const pieceIds = scenePieceIds(flowSceneId);
		return list.filter(e => {
			if (!e.toNodeId) return false;
			if (!byId.has(e.fromNodeId) || !byId.has(e.toNodeId)) return false;
			// Finish-objective is card/inspector only — not a board path
			if (isFinishObjectiveEdge(e)) return false;
			return pieceIds.has(e.fromNodeId) || pieceIds.has(e.toNodeId);
		});
	});

	/** Dashed parent→child structure edges in flow mode (not PlotEdges). */
	const parentLinks = $derived.by((): Array<{ fromId: string; toId: string }> => {
		if (view !== 'flow' || !flowSceneId || !flowBundle) return [];
		const links: Array<{ fromId: string; toId: string }> = [];
		for (const d of flowBundle.discoveries) links.push({ fromId: flowSceneId, toId: d.id });
		for (const e of flowBundle.encounters) links.push({ fromId: flowSceneId, toId: e.id });
		for (const d of flowBundle.decisions) {
			links.push({ fromId: flowSceneId, toId: d.id });
			for (const opt of d.options) links.push({ fromId: d.id, toId: opt.id });
		}
		for (const x of flowBundle.exits) links.push({ fromId: flowSceneId, toId: x.id });
		return links;
	});

	const selectedCard = $derived(localCards.find(c => c.id === selectedCardId) ?? null);
	const selectedPiece = $derived(selectedPieceId ? byId.get(selectedPieceId) ?? null : null);
	const selectedEdge = $derived(logicEdges.find(e => e.id === selectedEdgeId) ?? null);

	/** Focus node for inspector fields. Prefer byId (stable) over card copies. */
	const focusNode = $derived.by((): PlotNode | null => {
		// Ghosts are link targets outside this scene — never treat as a deletable in-scene piece
		if (selectedCard?.role === 'GHOST') return selectedCard.node;
		if (selectedPieceId) return byId.get(selectedPieceId) ?? null;
		if (view === 'flow' && focusStart && flowScene) return flowScene;
		if (selectedCardId) {
			const n = byId.get(selectedCardId);
			if (n) return n;
		}
		return selectedCard?.node ?? null;
	});

	const isGhostFocus = $derived(selectedCard?.role === 'GHOST');

	/** In-scene pieces (+ scene). Never objectives/endings via a scene-flow ghost. */
	const canDeleteFocus = $derived.by(() => {
		if (!structureEdit || !focusNode || isGhostFocus) return false;
		const k = focusNode.kind;
		// Scene graph may delete scenes/endings; scene flow only deletes local pieces / the scene
		if (view === 'graph') return k === 'SCENE' || k === 'ENDING';
		if (isStartFocus) return true;
		return k === 'DISCOVERY' || k === 'ENCOUNTER' || k === 'DECISION'
			|| k === 'DECISION_OPTION' || k === 'EXIT' || k === 'SCENE';
	});

	/** Edges in this scene that touch the focused ghost target. */
	const ghostLinks = $derived.by((): FlowEdge[] => {
		if (!isGhostFocus || !focusNode || !flowSceneId) return [];
		const pieceIds = scenePieceIds(flowSceneId);
		const gid = focusNode.id;
		return ((edges ?? []) as FlowEdge[]).filter(e => {
			if (!e.toNodeId) return false;
			const touches = e.fromNodeId === gid || e.toNodeId === gid;
			if (!touches) return false;
			return pieceIds.has(e.fromNodeId) || pieceIds.has(e.toNodeId);
		});
	});

	const isStartFocus = $derived(
		view === 'flow' && focusStart && !selectedPieceId && !!flowScene && focusNode?.id === flowScene.id,
	);

	// Drop selection if the piece was deleted (e.g. objective ghost removed)
	$effect(() => {
		const ids = new Set(boardCards.map(c => c.id));
		const nodeIds = new Set(byId.keys());
		const cardId = untrack(() => selectedCardId);
		const pieceId = untrack(() => selectedPieceId);
		const edgeId = untrack(() => selectedEdgeId);
		if (cardId && !ids.has(cardId)) selectedCardId = null;
		// Only clear piece focus when that node is gone — never bounce back to Start on refresh
		if (pieceId && !nodeIds.has(pieceId)) {
			selectedPieceId = null;
		}
		if (edgeId && !logicEdges.some(e => e.id === edgeId)) selectedEdgeId = null;
	});

	// Load inspector drafts only when switching focused piece — never while typing
	$effect(() => {
		const n = focusNode;
		const id = n?.id ?? null;
		if (id !== inspectorFocusId) {
			inspectorFocusId = id;
			inspectorTitle = n?.title ?? '';
			inspectorDesc = n?.description ?? '';
		}
	});

	function screenToWorld(clientX: number, clientY: number) {
		const rect = boardEl?.getBoundingClientRect();
		if (!rect) return { x: 200, y: 200 };
		return {
			x: (clientX - rect.left - panX) / zoom,
			y: (clientY - rect.top - panY) / zoom,
		};
	}

	function fitView() {
		if (!localCards.length || !boardEl) {
			panX = 24; panY = 24; zoom = 1;
			return;
		}
		const xs = localCards.map(n => n.posX);
		const ys = localCards.map(n => n.posY);
		const minX = Math.min(...xs) - 40;
		const maxX = Math.max(...xs) + 220;
		const minY = Math.min(...ys) - 40;
		const maxY = Math.max(...ys) + 160;
		const w = boardEl.clientWidth;
		const h = boardEl.clientHeight;
		const zx = w / Math.max(280, maxX - minX);
		const zy = h / Math.max(220, maxY - minY);
		zoom = Math.min(1.4, Math.max(0.4, Math.min(zx, zy)));
		panX = w / 2 - ((minX + maxX) / 2) * zoom;
		panY = h / 2 - ((minY + maxY) / 2) * zoom;
	}

	let fittedKey = $state('');
	$effect(() => {
		if (!boardEl || !localCards.length) return;
		const key = `${view}:${flowSceneId ?? 'g'}:${localCards.length}`;
		if (fittedKey === key) return;
		fittedKey = key;
		queueMicrotask(() => fitView());
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.92 : 1.08;
		const next = Math.min(2.5, Math.max(0.35, zoom * factor));
		const rect = boardEl?.getBoundingClientRect();
		if (rect) {
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			panX = mx - (mx - panX) * (next / zoom);
			panY = my - (my - panY) * (next / zoom);
		}
		zoom = next;
	}

	function zoomBy(factor: number) {
		const next = Math.min(2.5, Math.max(0.35, zoom * factor));
		const rect = boardEl?.getBoundingClientRect();
		if (rect) {
			const mx = rect.width / 2;
			const my = rect.height / 2;
			panX = mx - (mx - panX) * (next / zoom);
			panY = my - (my - panY) * (next / zoom);
		}
		zoom = next;
	}

	function onBoardPointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement).closest('.pfc-card, .pfc-edge-hit')) return;
		if (e.button !== 0) return;
		panning = true;
		panStart = { x: e.clientX, y: e.clientY, panX, panY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onBoardPointerMove(e: PointerEvent) {
		if (panning) {
			panX = panStart.panX + (e.clientX - panStart.x);
			panY = panStart.panY + (e.clientY - panStart.y);
			return;
		}
		if (draggingId && canDragNodes) {
			const dist = Math.hypot(e.clientX - dragOrigin.x, e.clientY - dragOrigin.y);
			if (!dragMoved && dist < DRAG_THRESHOLD_PX) return;
			if (!dragMoved) {
				dragMoved = true;
				e.preventDefault();
			}
			const w = screenToWorld(e.clientX, e.clientY);
			localCards = localCards.map(c =>
				c.id === draggingId ? { ...c, posX: w.x - dragOffset.x, posY: w.y - dragOffset.y } : c,
			);
		}
	}

	async function onBoardPointerUp() {
		if (panning) { panning = false; return; }
		if (draggingId && canDragNodes) {
			const id = draggingId;
			const c = localCards.find(x => x.id === id);
			const moved = dragMoved;
			draggingId = null;
			dragMoved = false;
			// Only persist when the card actually moved (click = select only)
			if (moved && c) await onMoveNode?.(id, { posX: c.posX, posY: c.posY });
		}
	}

	function onCardPointerDown(e: PointerEvent, card: BoardCard) {
		e.stopPropagation();
		if (e.button !== 0) return;

		// Select / connect on press — pointer capture was swallowing click, so inspector
		// stayed stuck on Start Node.
		if (mode === 'connect') {
			if (card.role === 'GHOST' && !connectFromId) return;
			void connectClick(card.id);
			return;
		}
		selectCard(card);

		if (!canDragNodes) return;
		draggingId = card.id;
		dragMoved = false;
		dragOrigin = { x: e.clientX, y: e.clientY };
		const w = screenToWorld(e.clientX, e.clientY);
		dragOffset = { x: w.x - card.posX, y: w.y - card.posY };
		boardEl?.setPointerCapture(e.pointerId);
	}

	function onCardDragStart(e: DragEvent) {
		e.preventDefault();
	}

	function selectCard(card: BoardCard) {
		selectedCardId = card.id;
		selectedEdgeId = null;
		if (view === 'flow') {
			if (card.role === 'START') {
				focusStart = true;
				selectedPieceId = null;
			} else if (card.role === 'GHOST') {
				focusStart = false;
				selectedPieceId = null;
			} else {
				focusStart = false;
				selectedPieceId = card.id;
			}
		} else {
			focusStart = false;
			selectedPieceId = null;
		}
	}

	async function connectClick(targetId: string) {
		if (!structureEdit || mode !== 'connect') return;
		if (!connectFromId) {
			connectFromId = targetId;
			return;
		}
		if (connectFromId === targetId) {
			connectFromId = null;
			return;
		}
		const a = connectFromId;
		const b = targetId;
		connectFromId = null;
		if (edgeKind === 'REQUIRES') {
			await onCreateEdge?.({ kind: 'REQUIRES', fromNodeId: b, toNodeId: a });
		} else {
			await onCreateEdge?.({ kind: edgeKind, fromNodeId: a, toNodeId: b });
		}
	}

	function onCardClick(e: MouseEvent, card: BoardCard) {
		e.stopPropagation();
		if (mode === 'connect') {
			if (card.role === 'GHOST' && !connectFromId) return;
			void connectClick(card.id);
			return;
		}
		selectCard(card);
	}

	function onCardDblClick(e: MouseEvent, card: BoardCard) {
		e.stopPropagation();
		if (view === 'graph' && card.role === 'SCENE') openFlow(card.id);
	}

	async function addScene() {
		if (!canEdit || !sceneTitle.trim()) return;
		const title = sceneTitle.trim();
		sceneTitle = '';
		await onCreateNode?.({ kind: 'SCENE', title, parentNodeId: null });
	}

	async function addEnding() {
		if (!canEdit || !endingTitle.trim()) return;
		const title = endingTitle.trim();
		endingTitle = '';
		await onCreateNode?.({ kind: 'ENDING', title, parentNodeId: null });
	}

	async function addFlowPiece(kind: 'DISCOVERY' | 'DECISION' | 'EXIT' | 'ENCOUNTER') {
		if (!canEdit || !flowSceneId || !childTitle.trim()) return;
		const title = childTitle.trim();
		childTitle = '';
		if (kind === 'ENCOUNTER') {
			const ek = newEncounterKind;
			await onCreateNode?.({
				kind,
				title,
				parentNodeId: flowSceneId,
				encounterKind: ek,
				socialFactionId: ek === 'SOCIAL' ? (newEncounterFactionId || null) : null,
				socialNpcId: ek === 'SOCIAL' ? (newEncounterNpcId || null) : null,
			});
			newEncounterFactionId = '';
			newEncounterNpcId = '';
			return;
		}
		await onCreateNode?.({ kind, title, parentNodeId: flowSceneId });
	}

	async function addOption(decisionId: string) {
		if (!canEdit || !optionTitle.trim()) return;
		const title = optionTitle.trim();
		optionTitle = '';
		optionForDecisionId = '';
		await onCreateNode?.({ kind: 'DECISION_OPTION', title, parentNodeId: decisionId });
	}

	async function saveTitle() {
		const n = focusNode;
		if (!n || !canEdit) return;
		const t = inspectorTitle.trim();
		if (!t || t === n.title) return;
		await onUpdateNode?.({ nodeId: n.id, title: t });
	}

	async function saveDesc() {
		const n = focusNode;
		if (!n || !canEdit) return;
		if ((n.description ?? '') === inspectorDesc) return;
		await onUpdateNode?.({ nodeId: n.id, description: inspectorDesc });
	}

	async function askDeleteNode(nodeId: string, label: string) {
		const ok = await confirmModal(
			'Delete piece?',
			`Delete “${label}” and its children? This cannot be undone.`,
		);
		if (ok) {
			await onDeleteNode?.(nodeId);
			if (selectedCardId === nodeId) selectedCardId = null;
			if (selectedPieceId === nodeId) selectedPieceId = null;
			if (flowSceneId === nodeId) backToGraph();
		}
	}

	async function askDeleteEdge(edgeId: string) {
		const ok = await confirmModal('Remove link?', 'Remove this Unlocks / Blocks / Needs link?');
		if (ok) {
			await onDeleteEdge?.(edgeId);
			selectedEdgeId = null;
		}
	}

	async function askDeleteEntry(id: string) {
		const ok = await confirmModal('Remove entry requirement?', 'Remove this entry requirement from the scene?');
		if (ok) await onDeleteEntry?.(id);
	}

	function cardSize(card: BoardCard): { w: number; h: number } {
		if (card.role === 'START' || card.role === 'SCENE') return { w: 216, h: 88 };
		if (card.role === 'ENDING' || card.role === 'GHOST') return { w: 176, h: 72 };
		if (card.role === 'DECISION_OPTION') return { w: 176, h: 72 };
		return { w: 200, h: 80 };
	}

	/** Dock from nearest side of each card so arrow direction stays readable. */
	function edgePath(from: BoardCard, to: BoardCard) {
		const a = cardSize(from);
		const b = cardSize(to);
		const cx1 = from.posX + a.w / 2;
		const cy1 = from.posY + a.h / 2;
		const cx2 = to.posX + b.w / 2;
		const cy2 = to.posY + b.h / 2;
		const dx = cx2 - cx1;
		const dy = cy2 - cy1;
		let x1: number, y1: number, x2: number, y2: number;
		if (Math.abs(dx) >= Math.abs(dy)) {
			x1 = dx >= 0 ? from.posX + a.w : from.posX;
			y1 = cy1;
			x2 = dx >= 0 ? to.posX : to.posX + b.w;
			y2 = cy2;
		} else {
			x1 = cx1;
			y1 = dy >= 0 ? from.posY + a.h : from.posY;
			x2 = cx2;
			y2 = dy >= 0 ? to.posY : to.posY + b.h;
		}
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, midX: mx, midY: my };
	}

	async function flipSelectedEdge() {
		if (!selectedEdge || !structureEdit || !selectedEdge.toNodeId) return;
		const e = selectedEdge;
		const newFromNodeId = e.toNodeId;
		const ok = await confirmModal('Flip link direction?', `Reverse this ${edgeKindDisplay(e)} link?`);
		if (!ok) return;
		await onDeleteEdge?.(e.id);
		await onCreateEdge?.({
			kind: e.kind,
			fromNodeId: newFromNodeId,
			toNodeId: e.fromNodeId,
			toPlotQuestId: e.toPlotQuestId ?? null,
		});
		selectedEdgeId = null;
	}

	function edgeEndpoints(e: FlowEdge): { from: BoardCard | null; to: BoardCard | null } {
		if (view === 'graph') {
			const fromCardId = graphCardIdFor(e.fromNodeId);
			const toCardId = e.toNodeId ? graphCardIdFor(e.toNodeId) : null;
			return {
				from: fromCardId ? cardById[fromCardId] ?? null : null,
				to: toCardId ? cardById[toCardId] ?? null : null,
			};
		}
		return {
			from: cardById[e.fromNodeId] ?? null,
			to: e.toNodeId ? cardById[e.toNodeId] ?? null : null,
		};
	}

	function edgeLabel(kind: string) {
		return EDGE_KINDS.find(o => o.value === kind)?.label ?? kind;
	}

	/** Display label for an edge kind, with Unlocks→Objective as Finish. */
	function edgeKindDisplay(e: FlowEdge): string {
		if (e.kind === 'UNLOCKS' && e.toNodeId) {
			const n = byId.get(e.toNodeId);
			if (n?.kind === 'OBJECTIVE') return 'Finish';
		}
		return edgeLabel(e.kind);
	}

	function edgeCaption(e: FlowEdge): string {
		const from = byId.get(e.fromNodeId);
		const kind = edgeKindDisplay(e);
		if (!from) return kind;
		if (view === 'graph' && (from.kind === 'SCENE' || from.kind === 'ENDING')) return kind;
		return `${from.title} · ${kind}`;
	}

	let entryKind = $state('NPC_ALIVE');
	let entryQuestId = $state('');
	let entryNpcId = $state('');
	let entryNodeId = $state('');
	let entryNote = $state('');
	let entryLabel = $state('');
	let addingEntry = $state(false);

	let addingEffect = $state(false);
	let effectKind = $state('NPC_FLAG');
	let effectLabel = $state('');
	let effectFactionId = $state('');
	let effectCharacterId = $state('');
	let effectValue = $state('0');
	let effectNpcId = $state('');
	let effectNpcStatus = $state('DEAD');
	let effectLockPlotId = $state('');
	let effectNote = $state('');

	let addingLink = $state(false);
	let linkKind = $state<'UNLOCKS' | 'BLOCKS'>('UNLOCKS');
	let linkTargetMode = $state<'node' | 'plot'>('node');
	let linkToNodeId = $state('');
	let linkToPlotId = $state('');
	let addingNeeds = $state(false);
	let needsFromId = $state('');

	/** Play advance form */
	let advanceStatus = $state('COMPLETED');
	let advanceDmNote = $state('');
	let advancePlayerNote = $state('');
	let advancePlayerVisible = $state(true);
	let advancing = $state(false);

	/** When choosing a path, advance this option id (may differ from current focus). */
	let advanceNodeId = $state<string | null>(null);
	let missSiblingIds = $state<string[]>([]);

	function openPlayAdvance(status: string, nodeId?: string, missSiblings: string[] = []) {
		advanceNodeId = nodeId ?? focusNode?.id ?? null;
		advanceStatus = status;
		missSiblingIds = missSiblings;
		advanceDmNote = '';
		advancePlayerNote = '';
		advancePlayerVisible = true;
		advancing = true;
	}

	async function submitPlayAdvance() {
		const id = advanceNodeId ?? focusNode?.id;
		if (!id || !playMode) return;
		await onAdvanceNode?.({
			nodeId: id,
			status: advanceStatus,
			note: advanceDmNote,
			playerNote: advancePlayerNote,
			playerNoteVisible: advancePlayerVisible && !!advancePlayerNote.trim(),
			// Server records siblings MISSED + parent decision COMPLETED + UNLOCKS→ACTIVE
			missSiblingIds: advanceStatus === 'COMPLETED' ? missSiblingIds : [],
		});
		advancing = false;
		advanceNodeId = null;
		missSiblingIds = [];
	}

	/** Party chose this option — Complete it and miss siblings. */
	function choosePath(optionId: string) {
		const opt = byId.get(optionId);
		if (!opt?.parentNodeId) {
			openPlayAdvance('COMPLETED', optionId);
			return;
		}
		const siblings = childrenOf(opt.parentNodeId, 'DECISION_OPTION')
			.filter(o => o.id !== optionId)
			.map(o => o.id);
		selectedPieceId = optionId;
		selectedCardId = optionId;
		focusStart = false;
		openPlayAdvance('COMPLETED', optionId, siblings);
	}

	const REVERT_TERMINAL = new Set(['COMPLETED', 'FAILED', 'MISSED', 'BLOCKED']);
	const REVERT_CLEAR = new Set(['COMPLETED', 'FAILED', 'MISSED', 'BLOCKED', 'ACTIVE']);

	function stateTime(n: PlotNode | undefined): number {
		const raw = n?.state?.updatedAt;
		if (!raw) return 0;
		return new Date(raw).getTime();
	}

	/** Client preview matching server cascade (step group + later play states). */
	function previewRevert(nodeId: string): { count: number; titles: string[]; restoreLabel: string } | null {
		const node = byId.get(nodeId);
		if (!node?.state || !REVERT_TERMINAL.has(node.state.status ?? '')) return null;

		const stepIds = new Set<string>([nodeId]);
		let restoreLabel = node.title;
		if (node.kind === 'DECISION_OPTION' && node.parentNodeId) {
			const dec = byId.get(node.parentNodeId);
			restoreLabel = dec?.title ?? 'Decision';
			stepIds.add(node.parentNodeId);
			for (const o of childrenOf(node.parentNodeId, 'DECISION_OPTION')) stepIds.add(o.id);
		} else if (node.kind === 'DECISION') {
			restoreLabel = node.title;
			for (const o of childrenOf(node.id, 'DECISION_OPTION')) stepIds.add(o.id);
		}

		const stepNodes = [...stepIds].map(id => byId.get(id)).filter(Boolean) as PlotNode[];
		const terminals = stepNodes.filter(n => REVERT_TERMINAL.has(n.state?.status ?? ''));
		if (!terminals.length) return null;

		let anchorMs: number;
		if (node.kind === 'DECISION_OPTION' && node.state.status === 'COMPLETED') {
			anchorMs = stateTime(node);
		} else if (node.kind === 'DECISION_OPTION' && node.state.status === 'MISSED') {
			const taken = stepNodes.find(n => n.state?.status === 'COMPLETED');
			anchorMs = taken
				? stateTime(taken)
				: Math.min(...terminals.map(stateTime));
		} else {
			anchorMs = Math.min(...terminals.map(stateTime));
		}

		const cleared = nodes.filter(n => {
			if (!n.state) return false;
			if (stepIds.has(n.id)) return true;
			if (stateTime(n) < anchorMs) return false;
			return REVERT_CLEAR.has(n.state.status ?? '');
		});
		const titles = cleared.map(n => n.title);
		return { count: titles.length, titles, restoreLabel };
	}

	function canRevertNode(nodeId: string): boolean {
		return !!previewRevert(nodeId);
	}

	async function confirmRevertNode(nodeId: string) {
		if (!playMode || !onRevertNode) return;
		const prev = previewRevert(nodeId);
		const piece = byId.get(nodeId);
		const name = piece?.title ?? 'this step';
		const later = prev
			? prev.count > 1
				? `${prev.count} pieces (this step and every choice after it)`
				: 'this step'
			: 'this step and every choice after it';
		const sample = prev?.titles.slice(0, 6).join(', ') ?? name;
		const more = (prev?.titles.length ?? 0) > 6 ? '…' : '';
		const ok = await confirmModal(
			'Revert this step?',
			`This clears ${later} and restores Current on “${prev?.restoreLabel ?? name}”. `
			+ `Play notes on those pieces are wiped. `
			+ `World effects already applied (renown, NPC flags, locked plots) are NOT undone.\n\n`
			+ `Clears: ${sample}${more}\n\n`
			+ 'This cannot be undone automatically.',
		);
		if (!ok) return;
		await onRevertNode(nodeId);
	}

	function decisionOptions(decisionId: string) {
		return childrenOf(decisionId, 'DECISION_OPTION');
	}

	const focusDecisionId = $derived.by(() => {
		if (!playMode) return null;
		const n = focusNode;
		if (!n) return null;
		if (n.kind === 'DECISION') return n.id;
		if (n.kind === 'DECISION_OPTION' && n.parentNodeId) return n.parentNodeId;
		return null;
	});

	function statusTone(status: string | undefined): string {
		if (!status || status === 'LOCKED') return 'locked';
		if (status === 'AVAILABLE' || status === 'ACTIVE') return 'open';
		if (status === 'COMPLETED') return 'done';
		if (status === 'FAILED' || status === 'MISSED' || status === 'BLOCKED') return 'closed';
		return 'locked';
	}

	/** Play / progression paint for nodes and connectors. */
	type PathPaint = 'taken' | 'current' | 'available' | 'blocked' | 'locked' | 'unreachable' | 'neutral';

	function rawPlayStatus(nodeId: string): string {
		return byId.get(nodeId)?.state?.status ?? 'LOCKED';
	}

	/** True if this piece is a legal next step from some Current (parent or Unlocks). */
	function isNextFromCurrent(nodeId: string): boolean {
		if (!playMode) return true;
		const currents = [...byId.values()]
			.filter(n => n.state?.status === 'ACTIVE')
			.map(n => n.id);
		if (!currents.length) return true;
		const n = byId.get(nodeId);
		if (!n) return false;
		for (const c of currents) {
			if (n.parentNodeId === c) return true;
			if (n.kind === 'DECISION_OPTION' && n.parentNodeId && currents.includes(n.parentNodeId)) {
				return true;
			}
			for (const e of (edges ?? []) as FlowEdge[]) {
				if (e.kind === 'UNLOCKS' && e.fromNodeId === c && e.toNodeId === nodeId) return true;
			}
		}
		return false;
	}

	function nodePathPaint(nodeId: string): PathPaint {
		const st = rawPlayStatus(nodeId);
		if (st === 'COMPLETED') return 'taken';
		if (st === 'ACTIVE') return 'current';
		if (st === 'BLOCKED' || st === 'FAILED') return 'blocked';
		if (st === 'MISSED') return 'unreachable';
		if (st === 'AVAILABLE' || availableIds.has(nodeId)) {
			// Open only if reachable from Current; otherwise treat as blocked
			if (playMode && !isNextFromCurrent(nodeId)) return 'blocked';
			return 'available';
		}
		if (st === 'LOCKED') return 'locked';
		return 'neutral';
	}

	/**
	 * Connector paint: purple = taken; green = Current trail / next from Current;
	 * red = locked; amber = blocked or unreachable from Current.
	 */
	function edgePathPaint(fromId: string, toId: string | null, kind: string): PathPaint {
		if (kind === 'BLOCKS') return 'blocked';
		if (!toId) return 'neutral';
		if (!playMode) return 'neutral';
		const fromSt = rawPlayStatus(fromId);
		const toSt = rawPlayStatus(toId);

		// Taken trail (raw status — Start may paint blocked but trail stays purple)
		if (fromSt === 'COMPLETED' && toSt === 'COMPLETED') return 'taken';
		if (toSt === 'COMPLETED' && (fromSt === 'AVAILABLE' || fromSt === 'ACTIVE' || fromSt === 'COMPLETED')) {
			return 'taken';
		}
		// Into Current along the play trail
		if (toSt === 'ACTIVE' && (fromSt === 'COMPLETED' || fromSt === 'ACTIVE')) return 'current';
		// Next step from Current
		if (fromSt === 'ACTIVE') {
			if (toSt === 'AVAILABLE' && isNextFromCurrent(toId)) return 'available';
			if (toSt === 'LOCKED') return 'locked';
			return 'blocked';
		}
		if (toSt === 'LOCKED' || fromSt === 'LOCKED') return 'locked';
		if (toSt === 'MISSED' || fromSt === 'MISSED') return 'blocked';
		// Unreachable from Current
		return 'blocked';
	}

	function parentLinkPaint(fromId: string, toId: string): PathPaint {
		return edgePathPaint(fromId, toId, 'PARENT');
	}

	function markerForPaint(paint: PathPaint, kind: string): string {
		if (paint === 'taken') return 'url(#pfc-arrow-taken)';
		if (paint === 'current') return 'url(#pfc-arrow-current)';
		if (paint === 'available') return 'url(#pfc-arrow-avail)';
		if (paint === 'blocked') return 'url(#pfc-arrow-blocked)';
		if (paint === 'locked') return 'url(#pfc-arrow-locked)';
		if (paint === 'unreachable') return 'url(#pfc-arrow-gray)';
		if (kind === 'BLOCKS') return 'url(#pfc-arrow-blocked)';
		if (kind === 'REQUIRES') return 'url(#pfc-arrow-needs)';
		return 'url(#pfc-arrow)';
	}

	function effectLabelOf(ef: any): string {
		return ef.label || EFFECT_OPTS.find(o => o.value === ef.kind)?.label || ef.kind;
	}

	function effectPayload(): string {
		if (effectKind === 'REPUTATION') {
			return JSON.stringify({
				factionId: effectFactionId,
				characterId: effectCharacterId,
				value: Number(effectValue),
			});
		}
		if (effectKind === 'NPC_FLAG') {
			return JSON.stringify({ npcId: effectNpcId, status: effectNpcStatus });
		}
		if (effectKind === 'LOCK_PLOT_QUEST') {
			return JSON.stringify({ plotQuestId: effectLockPlotId });
		}
		return JSON.stringify({ note: effectNote });
	}

	function openEffectForm() {
		addingEffect = true;
		effectKind = 'NPC_FLAG';
		effectLabel = '';
		effectFactionId = '';
		effectCharacterId = '';
		effectValue = '0';
		effectNpcId = '';
		effectNpcStatus = 'DEAD';
		effectLockPlotId = '';
		effectNote = '';
	}

	async function submitEffect(ownerNodeId: string) {
		await onCreateEffect?.({
			ownerNodeId,
			kind: effectKind,
			label: effectLabel,
			payload: effectPayload(),
		});
		addingEffect = false;
		effectLabel = '';
		effectNote = '';
	}

	async function askDeleteEffect(id: string) {
		const ok = await confirmModal('Remove consequence?', 'Remove this consequence?');
		if (ok) await onDeleteEffect?.(id);
	}

	$effect(() => {
		selectedPieceId;
		selectedCardId;
		focusStart;
		addingEffect = false;
		addingLink = false;
		addingNeeds = false;
		advancing = false;
		linkToNodeId = '';
		linkToPlotId = '';
		needsFromId = '';
	});

	function completionEdgesFrom(nodeId: string) {
		return (edges ?? []).filter((e: FlowEdge) =>
			e.fromNodeId === nodeId && (e.kind === 'UNLOCKS' || e.kind === 'BLOCKS'));
	}

	function needsEdgesOf(nodeId: string) {
		return (edges ?? []).filter((e: FlowEdge) => e.toNodeId === nodeId && e.kind === 'REQUIRES');
	}

	function edgeTargetLabel(e: FlowEdge): string {
		if (e.toPlotQuestId) {
			const p = otherPlots.find(x => x.id === e.toPlotQuestId);
			return `plot: ${p?.title ?? '…'}`;
		}
		const n = e.toNodeId ? byId.get(e.toNodeId) : null;
		if (!n) return '…';
		return `${kindLabel(n.kind)}: ${n.title}`;
	}

	/** Unlocks → Objective is “Finish”, not a Current jump. */
	function completionEdgeBadge(e: FlowEdge): string {
		if (e.kind === 'UNLOCKS' && e.toNodeId && byId.get(e.toNodeId)?.kind === 'OBJECTIVE') {
			return 'Finish';
		}
		return COMPLETION_EDGE_OPTS.find(o => o.value === e.kind)?.label ?? edgeKindDisplay(e);
	}

	function onPlayStatusChange(nodeId: string, status: string) {
		const upper = status.toUpperCase();
		if (playMode && upper === 'ACTIVE' && onSetCurrent) {
			void onSetCurrent(nodeId);
			return;
		}
		if (playMode && onAdvanceNode && (upper === 'COMPLETED' || upper === 'FAILED')) {
			const n = byId.get(nodeId);
			let miss: string[] = [];
			if (upper === 'COMPLETED' && n?.kind === 'DECISION_OPTION' && n.parentNodeId) {
				miss = childrenOf(n.parentNodeId, 'DECISION_OPTION')
					.filter(o => o.id !== nodeId)
					.map(o => o.id);
			}
			openPlayAdvance(upper, nodeId, miss);
			return;
		}
		onSetStatus?.(nodeId, status);
	}

	async function setFocusCurrent(nodeId: string) {
		if (!onSetCurrent) return;
		await onSetCurrent(nodeId);
	}

	function hasFinishPlotEffect(n: PlotNode): boolean {
		return (n.effects ?? []).some((ef: any) => {
			const p = ef.payload && typeof ef.payload === 'object' ? ef.payload : {};
			return ef.kind === 'CUSTOM' && p.finishPlot === true;
		});
	}

	async function submitCompletionLink(fromNodeId: string) {
		if (linkTargetMode === 'node') {
			if (!linkToNodeId) return;
			await onCreateEdge?.({
				kind: linkKind,
				fromNodeId,
				toNodeId: linkToNodeId,
				toPlotQuestId: null,
			});
		} else {
			if (!linkToPlotId) return;
			await onCreateEdge?.({
				kind: linkKind,
				fromNodeId,
				toNodeId: null,
				toPlotQuestId: linkToPlotId,
			});
		}
		addingLink = false;
		linkToNodeId = '';
		linkToPlotId = '';
	}

	async function submitNeeds(ownerId: string) {
		if (!needsFromId) return;
		await onCreateEdge?.({
			kind: 'REQUIRES',
			fromNodeId: needsFromId,
			toNodeId: ownerId,
		});
		addingNeeds = false;
		needsFromId = '';
	}

	async function quickUnlock(fromNodeId: string, toNodeId: string) {
		await onCreateEdge?.({
			kind: 'UNLOCKS',
			fromNodeId,
			toNodeId,
			toPlotQuestId: null,
		});
	}

	async function addFinishPlotEffect(ownerNodeId: string) {
		await onCreateEffect?.({
			ownerNodeId,
			kind: 'CUSTOM',
			label: 'Finish this plot',
			payload: JSON.stringify({ finishPlot: true }),
		});
	}

	async function submitEntry(sceneId: string) {
		let payload = '{}';
		if (entryKind === 'QUEST_ACCEPTED') payload = JSON.stringify({ questId: entryQuestId });
		else if (entryKind === 'NPC_ALIVE') payload = JSON.stringify({ npcId: entryNpcId });
		else if (entryKind === 'NODE_COMPLETED' || entryKind === 'OBJECTIVE_COMPLETE') payload = JSON.stringify({ nodeId: entryNodeId });
		else payload = JSON.stringify({ note: entryNote });
		await onCreateEntry?.({
			sceneNodeId: sceneId,
			kind: entryKind,
			label: entryLabel,
			payload,
		});
		addingEntry = false;
		entryLabel = '';
		entryNote = '';
	}

	function describeEntry(req: EntryReq): string {
		const p = req.payload && typeof req.payload === 'object' ? req.payload : {};
		const kind = ENTRY_OPTS.find(o => o.value === req.kind)?.label ?? req.kind;
		if (req.kind === 'QUEST_ACCEPTED') {
			const q = catalog.quests.find(x => x.id === p.questId);
			return `${kind}: ${q?.title ?? p.questId ?? '?'}`;
		}
		if (req.kind === 'NPC_ALIVE') {
			const n = catalog.npcs.find(x => x.id === p.npcId);
			return `${kind}: ${n?.name ?? p.npcId ?? '?'}`;
		}
		if (req.kind === 'NODE_COMPLETED' || req.kind === 'OBJECTIVE_COMPLETE') {
			const n = catalog.allNodes.find(x => x.id === p.nodeId);
			return `${kind}: ${n?.title ?? p.nodeId ?? '?'}`;
		}
		return req.label || kind;
	}

	function outboundFromScene(sceneId: string): FlowEdge[] {
		const pieceIds = scenePieceIds(sceneId);
		return (edges ?? []).filter((e: FlowEdge) =>
			pieceIds.has(e.fromNodeId) || (e.kind === 'REQUIRES' && e.toNodeId && pieceIds.has(e.toNodeId)));
	}

	function statusOf(n: PlotNode) {
		return STATUS_LABELS[n.state?.status ?? ''] ?? n.state?.status ?? 'Locked';
	}

	function canHaveEffects(n: PlotNode | null | undefined): boolean {
		return !!n && EFFECT_KINDS.has(n.kind);
	}

	function canHaveLinks(n: PlotNode | null | undefined): boolean {
		return !!n && LINK_KINDS.has(n.kind);
	}

	function kindLabel(kind: string): string {
		return ({
			OBJECTIVE: 'Objective', SCENE: 'Scene', ENDING: 'Ending',
			DISCOVERY: 'Discovery', ENCOUNTER: 'Encounter', DECISION: 'Decision',
			DECISION_OPTION: 'Option', EXIT: 'Exit', FAILURE_CONDITION: 'Failure',
		} as Record<string, string>)[kind] ?? kind;
	}

	function roleLabel(role: BoardCard['role']): string {
		if (role === 'START') return 'Start Node';
		if (role === 'GHOST') return 'Outside scene';
		return kindLabel(role);
	}

	const linkTargetNodes = $derived(
		allNodes.filter(n =>
			n.kind === 'OBJECTIVE' || n.kind === 'SCENE' || n.kind === 'ENDING'
			|| n.kind === 'DISCOVERY' || n.kind === 'ENCOUNTER' || n.kind === 'EXIT' || n.kind === 'DECISION'
			|| n.kind === 'DECISION_OPTION' || n.kind === 'FAILURE_CONDITION'),
	);

	/** In-scene pieces you can Unlocks-continue to (follow-up steps). */
	const continueInSceneTargets = $derived.by((): PlotNode[] => {
		if (view !== 'flow' || !flowSceneId || !flowBundle) return [];
		const out: PlotNode[] = [];
		for (const d of flowBundle.discoveries) out.push(d);
		for (const e of flowBundle.encounters) out.push(e);
		for (const d of flowBundle.decisions) {
			out.push(d);
			for (const opt of d.options) out.push(opt);
		}
		for (const x of flowBundle.exits) out.push(x);
		return out;
	});

	const canQuickContinue = $derived(
		!!focusNode && (
			focusNode.kind === 'DISCOVERY'
			|| focusNode.kind === 'ENCOUNTER'
			|| focusNode.kind === 'DECISION'
			|| focusNode.kind === 'DECISION_OPTION'
			|| focusNode.kind === 'SCENE'
			|| isStartFocus
		),
	);

	const flowDecisions = $derived(flowBundle?.decisions ?? []);
</script>

<div class="pfc" class:pfc--busy={busy} class:pfc--flow={view === 'flow'}>
	<div class="pfc__toolbar">
		<div class="pfc__modes">
			{#if view === 'flow'}
				<button type="button" class="btn btn-ghost btn-sm" onclick={backToGraph}>← Scene graph</button>
				<span class="pfc__layer-label">Scene flow · {flowScene?.title ?? '…'}</span>
			{:else}
				<span class="pfc__layer-label">Scene graph</span>
			{/if}
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'select'} class:btn-ghost={mode !== 'select'} onclick={() => { mode = 'select'; connectFromId = null; }}>Select</button>
			{#if structureEdit}
				<button type="button" class="btn btn-sm" class:btn-primary={mode === 'connect'} class:btn-ghost={mode !== 'connect'} onclick={() => { mode = 'connect'; connectFromId = null; }}>Connect</button>
				{#if mode === 'connect'}
					<select class="input input--select" style="width:auto;" bind:value={edgeKind}>
						{#each EDGE_KINDS as o}<option value={o.value}>{o.label}</option>{/each}
					</select>
					<span class="pfc__hint">
						{#if connectFromId}
							Click target to finish the link…
						{:else}
							Click source, then target (Unlocks / Blocks / Needs)…
						{/if}
					</span>
				{/if}
			{:else if playMode}
				<span class="pfc__hint">Open a scene → choose the path — purple = taken on the flow</span>
			{/if}
		</div>
		<div class="pfc__tools">
			{#if playMode}
				<span class="pfc__legend" title="Play path colors">
					<span class="pfc__leg pfc__leg--taken">Taken</span>
					<span class="pfc__leg pfc__leg--current">Current</span>
					<span class="pfc__leg pfc__leg--avail">Open</span>
					<span class="pfc__leg pfc__leg--locked">Locked</span>
					<span class="pfc__leg pfc__leg--blocked">Blocked</span>
					<span class="pfc__leg pfc__leg--gray">Closed</span>
				</span>
			{/if}
			{#if structureEdit && view === 'graph'}
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => onRelayout?.()} disabled={busy}>Relayout</button>
			{/if}
			<button type="button" class="btn btn-ghost btn-sm" onclick={fitView}>Fit</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => zoomBy(1.15)}>+</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => zoomBy(1 / 1.15)}>−</button>
		</div>
	</div>

	{#if view === 'graph' && structureEdit}
		<div class="pfc__palette pfc__palette--bar">
			<input class="input" placeholder="New scene title" bind:value={sceneTitle} style="min-width:10rem; flex:1;" />
			<button type="button" class="btn btn-primary btn-sm" disabled={busy || !sceneTitle.trim()} onclick={addScene}>+ Add scene</button>
			<input class="input" placeholder="New ending title" bind:value={endingTitle} style="min-width:8rem; flex:1;" />
			<button type="button" class="btn btn-ghost btn-sm" disabled={busy || !endingTitle.trim()} onclick={addEnding}>+ Add ending</button>
		</div>
	{/if}

	<div class="pfc__body" class:pfc__body--flow={view === 'flow' && !playMode}>
		{#if view === 'flow' && !playMode}
			<aside class="pfc__side-palette">
				<div class="pfc__sub">Scene elements</div>
				{#if structureEdit}
					<input class="input" placeholder="Title" bind:value={childTitle} disabled={busy} />
					<button type="button" class="btn btn-primary btn-sm" disabled={busy || !childTitle.trim()} onclick={() => addFlowPiece('DISCOVERY')}>+ Discovery</button>
					<button type="button" class="btn btn-primary btn-sm" disabled={busy || !childTitle.trim()} onclick={() => addFlowPiece('DECISION')}>+ Decision</button>
					<button type="button" class="btn btn-primary btn-sm" disabled={busy || !childTitle.trim()} onclick={() => addFlowPiece('EXIT')}>+ Exit</button>
					<div class="pfc__sub" style="margin-top:0.65rem;">+ Encounter</div>
					<select class="input input--select" bind:value={newEncounterKind} disabled={busy}>
						{#each ENCOUNTER_OPTS as o}
							<option value={o.value}>{o.label}</option>
						{/each}
					</select>
					{#if newEncounterKind === 'SOCIAL'}
						<select class="input input--select" bind:value={newEncounterFactionId} disabled={busy}>
							<option value="">Faction (optional)…</option>
							{#each plotFactions as f}<option value={f.id}>{f.name}</option>{/each}
						</select>
						<select class="input input--select" bind:value={newEncounterNpcId} disabled={busy}>
							<option value="">NPC (optional)…</option>
							{#each plotNpcs as n}<option value={n.id}>{n.name}</option>{/each}
						</select>
						{#if !plotFactions.length && !plotNpcs.length}
							<p class="pfc__hint">Link factions/NPCs on the Links tab for Social picks.</p>
						{/if}
					{/if}
					<button type="button" class="btn btn-primary btn-sm" disabled={busy || !childTitle.trim()} onclick={() => addFlowPiece('ENCOUNTER')}>+ Encounter</button>
					{#if flowDecisions.length}
						<div class="pfc__sub" style="margin-top:0.65rem;">+ Option under</div>
						<select class="input input--select" bind:value={optionForDecisionId} disabled={busy}>
							<option value="">Decision…</option>
							{#each flowDecisions as d}
								<option value={d.id}>{d.title}</option>
							{/each}
						</select>
						<input class="input" placeholder="Option title" bind:value={optionTitle} disabled={busy} />
						<button
							type="button"
							class="btn btn-ghost btn-sm"
							disabled={busy || !optionTitle.trim() || !optionForDecisionId}
							onclick={() => optionForDecisionId && addOption(optionForDecisionId)}
						>+ Option</button>
					{/if}
				{:else}
					<p class="pfc__hint">View only.</p>
				{/if}
				<p class="pfc__hint" style="margin-top:0.75rem;">
					<strong>Start Node</strong> is always on the board — entry gates and scene-level links live there.
				</p>
				<button type="button" class="btn btn-ghost btn-sm" style="margin-top:auto;" onclick={backToGraph}>← Back to graph</button>
			</aside>
		{/if}

		<div
			class="pfc__board"
			role="application"
			aria-label={view === 'flow' ? 'Scene flow. Drag to pan, scroll to zoom.' : 'Scene graph. Drag to pan, scroll to zoom.'}
			bind:this={boardEl}
			onwheel={onWheel}
			onpointerdown={onBoardPointerDown}
			onpointermove={onBoardPointerMove}
			onpointerup={onBoardPointerUp}
			onpointercancel={onBoardPointerUp}
		>
			{#if !localCards.length}
				<div class="pfc__empty">
					{#if view === 'flow'}
						<p>This scene has no pieces yet. Add a Discovery, Decision, or Exit from the left palette.</p>
					{:else}
						<p>No scenes yet. Add a <strong>Scene</strong>, then double-click or use <strong>Edit flow</strong> to build its workflow. Link scenes with <strong>Connect</strong>.</p>
					{/if}
				</div>
			{/if}

			<div class="pfc__world" style="transform: translate({panX}px, {panY}px) scale({zoom});">
				<svg class="pfc__edges" viewBox="0 0 2400 1600" width="2400" height="1600">
					<defs>
						<marker id="pfc-arrow" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="var(--accent)" />
						</marker>
						<marker id="pfc-arrow-blocks" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="#ea580c" />
						</marker>
						<marker id="pfc-arrow-blocked" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="#ea580c" />
						</marker>
						<marker id="pfc-arrow-locked" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="#c45c4a" />
						</marker>
						<marker id="pfc-arrow-needs" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="var(--color-warning, #c9a227)" />
						</marker>
						<marker id="pfc-arrow-parent" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L8,4 L0,8 Z" fill="var(--text-muted)" />
						</marker>
						<marker id="pfc-arrow-taken" markerWidth="14" markerHeight="14" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L12,6 L0,12 Z" fill="#8b5cf6" />
						</marker>
						<marker id="pfc-arrow-avail" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L10,5 L0,10 Z" fill="#22a06b" />
						</marker>
						<marker id="pfc-arrow-current" markerWidth="14" markerHeight="14" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L12,6 L0,12 Z" fill="#10b981" />
						</marker>
						<marker id="pfc-arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
							<path d="M0,0 L8,4 L0,8 Z" fill="#8a8f98" />
						</marker>
					</defs>
					{#if view === 'flow'}
						{#each parentLinks as pl, i (`pl-${pl.fromId}-${pl.toId}-${i}`)}
							{@const from = cardById[pl.fromId]}
							{@const to = cardById[pl.toId]}
							{#if from && to}
								{@const path = edgePath(from, to)}
								{@const paint = parentLinkPaint(pl.fromId, pl.toId)}
								<path
									class="pfc-edge pfc-edge--parent pfc-edge--paint-{paint}"
									d={path.d}
									fill="none"
									marker-end={paint === 'neutral' ? 'url(#pfc-arrow-parent)' : markerForPaint(paint, 'PARENT')}
								/>
							{/if}
						{/each}
					{/if}
					{#each logicEdges as e (e.id)}
						{@const ends = edgeEndpoints(e)}
						{#if ends.from && ends.to}
							{@const path = edgePath(ends.from, ends.to)}
							{@const paint = edgePathPaint(e.fromNodeId, e.toNodeId, e.kind)}
							{@const marker = markerForPaint(paint, e.kind)}
							<path
								class="pfc-edge pfc-edge--paint-{paint}"
								class:pfc-edge--on={selectedEdgeId === e.id}
								class:pfc-edge--blocks={!playMode && e.kind === 'BLOCKS'}
								class:pfc-edge--needs={!playMode && e.kind === 'REQUIRES'}
								d={path.d}
								fill="none"
								marker-end={marker}
							/>
							<path
								class="pfc-edge-hit"
								d={path.d}
								fill="none"
								stroke="transparent"
								stroke-width="16"
								role="button"
								tabindex="0"
								onclick={() => { selectedEdgeId = e.id; selectedCardId = null; selectedPieceId = null; focusStart = false; }}
								onkeydown={(ev) => { if (ev.key === 'Enter') { selectedEdgeId = e.id; selectedCardId = null; selectedPieceId = null; focusStart = false; } }}
							/>
							<text class="pfc-edge-label" x={path.midX} y={path.midY} pointer-events="none">{edgeCaption(e)}</text>
						{/if}
					{/each}
				</svg>

				{#each localCards as card (card.id + ':' + card.role)}
					{@const paint = playMode ? nodePathPaint(card.id) : 'neutral'}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="pfc-card pfc-card--{card.role.toLowerCase()}"
						class:pfc-card--on={
							(card.role === 'START' && isStartFocus)
							|| (view === 'graph' && selectedCardId === card.id)
							|| (card.role !== 'START' && selectedPieceId === card.id)
							|| (card.role === 'GHOST' && selectedCardId === card.id && !selectedPieceId && !focusStart)
						}
						class:pfc-card--connect={connectFromId === card.id}
						class:pfc-card--dragging={draggingId === card.id}
						class:pfc-card--paint-taken={paint === 'taken'}
						class:pfc-card--paint-current={paint === 'current'}
						class:pfc-card--paint-available={paint === 'available'}
						class:pfc-card--paint-blocked={paint === 'blocked'}
						class:pfc-card--paint-locked={paint === 'locked'}
						class:pfc-card--paint-unreachable={paint === 'unreachable'}
						style="left:{card.posX}px; top:{card.posY}px;"
						draggable="false"
						onpointerdown={(e) => onCardPointerDown(e, card)}
						ondragstart={onCardDragStart}
						onclick={(e) => onCardClick(e, card)}
						ondblclick={(e) => {
							if (playMode && card.role === 'DECISION_OPTION') {
								e.stopPropagation();
								choosePath(card.id);
								return;
							}
							if (playMode && card.role === 'DECISION') {
								e.stopPropagation();
								selectCard(card);
								return;
							}
							if (!playMode) onCardDblClick(e, card);
						}}
					>
						{#if card.role === 'START'}
							<div class="pfc-card__head">
								<span class="pfc-card__kind pfc-card__kind--start">Start Node</span>
								<span class="pfc-card__status">{statusOf(card.node)}</span>
							</div>
							<div class="pfc-card__title">{card.node.title}</div>
							{#if flowBundle?.entry?.length}
								<div class="pfc-card__meta">
									{#each flowBundle.entry as req (req.id)}
										<span class="pfc-card__pill">{describeEntry(req)}</span>
									{/each}
								</div>
							{:else}
								<div class="pfc-card__meta muted">Entry gates…</div>
							{/if}
						{:else if view === 'graph' && card.role === 'SCENE'}
							{@const bundle = sceneBundle(card.id)}
							<div class="pfc-card__head">
								<span class="pfc-card__kind">Scene</span>
								<span class="pfc-card__status">{statusOf(card.node)}</span>
							</div>
							<div class="pfc-card__title">{card.node.title}</div>
							<div class="pfc-card__meta">
								{bundle.discoveries.length} disc · {bundle.encounters.length} enc · {bundle.decisions.length} dec · {bundle.exits.length} exit
							</div>
							{#each bundle.exits as x (x.id)}
								{@const dest = exitDestLabel(x.id)}
								{@const finishes = finishLabels(x.id)}
								<div class="pfc-card__exit-line">
									{x.title}{#if finishes} · Finishes: {finishes}{/if}{#if dest} → {dest}{/if}
								</div>
							{/each}
							<button
								type="button"
								class="btn btn-primary btn-sm pfc-card__edit-flow"
								onpointerdown={(e) => e.stopPropagation()}
								onclick={(e) => { e.stopPropagation(); openFlow(card.id); }}
							>{playMode ? 'Open scene' : 'Edit flow'}</button>
						{:else if card.role === 'ENDING'}
							<div class="pfc-card__head">
								<span class="pfc-card__kind">Ending</span>
								<span class="pfc-card__status">{statusOf(card.node)}</span>
							</div>
							<div class="pfc-card__title">{card.node.title}</div>
							{#if (card.node.effects ?? []).length}
								<div class="pfc-card__meta">{(card.node.effects ?? []).length} consequence(s)</div>
							{/if}
						{:else if card.role === 'GHOST'}
							<div class="pfc-card__head">
								<span class="pfc-card__kind">Link target</span>
							</div>
							<div class="pfc-card__title">{card.ghostLabel ?? card.node.title}</div>
							{#if canDragNodes}
								<div class="pfc-card__meta muted">Drag to position</div>
							{/if}
						{:else}
							<div class="pfc-card__head">
								<span class="pfc-card__kind">{roleLabel(card.role)}</span>
								<span class="pfc-card__status">
									{#if playMode && paint === 'taken'}Taken
									{:else if playMode && paint === 'current'}Current
									{:else}
										{statusOf(card.node)}
									{/if}
								</span>
							</div>
							<div class="pfc-card__title">{card.node.title}</div>
							{#if card.role === 'ENCOUNTER'}
								<div class="pfc-card__meta">{encounterLabel(card.node.encounterKind)}</div>
							{/if}
							{@const finishes = finishLabels(card.id)}
							{@const dest = pathDestLabel(card.id)}
							{#if finishes}
								<div class="pfc-card__meta pfc-card__meta--finish">Finishes: {finishes}</div>
							{/if}
							{#if dest}
								<div class="pfc-card__meta">→ {dest}</div>
							{/if}
							{#if (card.node.effects ?? []).length}
								<span class="pfc-card__badge">{(card.node.effects ?? []).length}</span>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<aside class="pfc__inspector">
			{#if selectedEdge && structureEdit}
				<h4>Link · {edgeKindDisplay(selectedEdge)}</h4>
				<p class="pfc__hint">{edgeCaption(selectedEdge)} → {edgeTargetLabel(selectedEdge)}</p>
				{#if selectedEdge.toNodeId}
					<button type="button" class="btn btn-ghost btn-sm" disabled={busy} onclick={flipSelectedEdge}>Flip direction</button>
				{/if}
				<button type="button" class="btn btn-danger btn-sm" disabled={busy} onclick={() => askDeleteEdge(selectedEdge.id)}>Remove link</button>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => selectedEdgeId = null}>Close</button>

			{:else if focusNode}
				{@const focus = focusNode}
				<h4>
					{#if isGhostFocus}
						Link target · {kindLabel(focus.kind)}
					{:else if isStartFocus}
						Scene inspector: {focus.title} (Start Node)
					{:else}
						{kindLabel(focus.kind)}
					{/if}
				</h4>

				{#if isGhostFocus}
					<p class="pfc__title">{focus.title}</p>
					<p class="pfc__hint">
						Outside this scene — shown because of a Finish / Unlocks / Blocks / Needs link.
						Remove the link here; edit or delete the {kindLabel(focus.kind).toLowerCase()} on its own tab
						(Objectives / Endings / …), not from scene flow.
					</p>
					<div class="pfc__block">
						<div class="pfc__sub">Links from this scene</div>
						{#each ghostLinks as e (e.id)}
							<div class="pfc__chip">
								<span class="badge">{completionEdgeBadge(e)}</span>
								<strong>{edgeCaption(e)} → {edgeTargetLabel(e)}</strong>
								{#if structureEdit && onDeleteEdge}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => askDeleteEdge(e.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pfc__hint">No links (refresh if this chip is stale).</p>
						{/each}
					</div>
				{:else if structureEdit}
					<label class="label" for="pfc-title">Title</label>
					<input id="pfc-title" class="input" bind:value={inspectorTitle} onblur={saveTitle} disabled={busy} />

					<label class="label" for="pfc-desc">Description</label>
					<textarea
						id="pfc-desc"
						class="input pfc__textarea"
						rows="4"
						bind:value={inspectorDesc}
						onblur={saveDesc}
						placeholder="What happens here…"
					></textarea>

					{#if focus.kind === 'ENCOUNTER'}
						<label class="label" for="pfc-enc-kind">Encounter type</label>
						<select
							id="pfc-enc-kind"
							class="input input--select"
							value={focus.encounterKind ?? 'COMBAT'}
							disabled={busy}
							onchange={(e) => {
								const encounterKind = e.currentTarget.value;
								void onUpdateNode?.({
									nodeId: focus.id,
									encounterKind,
									socialFactionId: encounterKind === 'SOCIAL' ? (focus.socialFactionId ?? '') : '',
									socialNpcId: encounterKind === 'SOCIAL' ? (focus.socialNpcId ?? '') : '',
								});
							}}
						>
							{#each ENCOUNTER_OPTS as o}
								<option value={o.value}>{o.label}</option>
							{/each}
						</select>
						{#if (focus.encounterKind ?? 'COMBAT') === 'SOCIAL'}
							<label class="label" for="pfc-enc-faction">Faction</label>
							<select
								id="pfc-enc-faction"
								class="input input--select"
								value={focus.socialFactionId ?? ''}
								disabled={busy}
								onchange={(e) => onUpdateNode?.({
									nodeId: focus.id,
									encounterKind: 'SOCIAL',
									socialFactionId: e.currentTarget.value,
									socialNpcId: focus.socialNpcId ?? '',
								})}
							>
								<option value="">None</option>
								{#each plotFactions as f}<option value={f.id}>{f.name}</option>{/each}
							</select>
							<label class="label" for="pfc-enc-npc">NPC</label>
							<select
								id="pfc-enc-npc"
								class="input input--select"
								value={focus.socialNpcId ?? ''}
								disabled={busy}
								onchange={(e) => onUpdateNode?.({
									nodeId: focus.id,
									encounterKind: 'SOCIAL',
									socialFactionId: focus.socialFactionId ?? '',
									socialNpcId: e.currentTarget.value,
								})}
							>
								<option value="">None</option>
								{#each plotNpcs as n}<option value={n.id}>{n.name}</option>{/each}
							</select>
							{#if !plotFactions.length && !plotNpcs.length}
								<p class="pfc__hint">Link factions/NPCs on the Links tab to pick them here.</p>
							{/if}
						{/if}
					{/if}
				{:else}
					<p class="pfc__title">{focus.title}</p>
					{#if focus.description}<p class="pfc__hint" style="white-space:pre-wrap;">{focus.description}</p>{/if}
					{#if focus.kind === 'ENCOUNTER'}
						<p class="pfc__hint">
							Type: <strong>{encounterLabel(focus.encounterKind)}</strong>
							{#if focus.encounterKind === 'SOCIAL'}
								{#if focus.socialFactionId}
									· Faction: {plotFactions.find(f => f.id === focus.socialFactionId)?.name
										?? factions.find(f => f.id === focus.socialFactionId)?.name
										?? '…'}
								{/if}
								{#if focus.socialNpcId}
									· NPC: {plotNpcs.find(n => n.id === focus.socialNpcId)?.name
										?? catalog.npcs.find(n => n.id === focus.socialNpcId)?.name
										?? '…'}
								{/if}
							{/if}
						</p>
					{/if}
				{/if}

				{#if !isGhostFocus && canEdit}
					<label class="label" for="pfc-st">Status</label>
					<select
						id="pfc-st"
						class="input input--select"
						value={focus.state?.status ?? 'LOCKED'}
						onchange={(e) => onPlayStatusChange(
							isStartFocus && flowScene ? flowScene.id : focus.id,
							e.currentTarget.value,
						)}
						disabled={busy}
					>
						{#each Object.keys(STATUS_LABELS) as s}
							<option value={s}>{s === 'ACTIVE' && playMode ? 'Current' : STATUS_LABELS[s]}</option>
						{/each}
					</select>
				{/if}

				{#if !isGhostFocus && playMode && canEdit}
					{#if advancing}
						<div class="pfc__block pfc__play-path">
							<div class="pfc__sub">Confirm path</div>
							<p class="pfc__hint">
								{#if advanceStatus === 'COMPLETED' && missSiblingIds.length}
									Mark <strong>{byId.get(advanceNodeId ?? '')?.title ?? '…'}</strong> as taken;
									other options → Missed. Current moves forward (Unlocks if any, otherwise next in scene).
								{:else}
									Advance → {STATUS_LABELS[advanceStatus] ?? advanceStatus}
									{#if advanceNodeId}: {byId.get(advanceNodeId)?.title}
									{/if}
								{/if}
							</p>
							<label class="label" for="adv-dm">DM note (private)</label>
							<textarea id="adv-dm" class="input" rows="2" bind:value={advanceDmNote}></textarea>
							<label class="label" for="adv-pl">Player note</label>
							<textarea id="adv-pl" class="input" rows="2" bind:value={advancePlayerNote}></textarea>
							<label class="label" style="display:flex; gap:0.4rem; align-items:center;">
								<input type="checkbox" bind:checked={advancePlayerVisible} />
								Visible to players
							</label>
							<div class="pfc__row">
								<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={submitPlayAdvance}>
									{missSiblingIds.length ? 'Confirm path taken' : 'Confirm'}
								</button>
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => { advancing = false; advanceNodeId = null; missSiblingIds = []; }}>Cancel</button>
							</div>
						</div>
					{:else}
						{#if focusDecisionId}
							{@const opts = decisionOptions(focusDecisionId)}
							{@const dec = byId.get(focusDecisionId)}
							<div class="pfc__block pfc__play-path">
								<div class="pfc__sub">Which path did they take?</div>
								<p class="pfc__hint">Decision: <strong>{dec?.title ?? '…'}</strong> — pick the option the party chose.</p>
								{#each opts as opt (opt.id)}
									{@const st = opt.state?.status ?? 'LOCKED'}
									{@const taken = st === 'COMPLETED'}
									{@const resolved = taken || st === 'MISSED' || st === 'BLOCKED' || st === 'FAILED'}
									<div class="pfc__path-row">
										<button
											type="button"
											class="pfc__path-btn"
											class:pfc__path-btn--taken={taken}
											class:pfc__path-btn--missed={st === 'MISSED' || st === 'BLOCKED' || st === 'FAILED'}
											disabled={busy || taken}
											onclick={() => choosePath(opt.id)}
										>
											<span class="pfc__path-btn-title">{opt.title}</span>
											<span class="pfc__path-btn-act">
												{#if taken}Taken{:else if st === 'MISSED'}Missed{:else}They chose this →{/if}
											</span>
										</button>
										{#if resolved && canRevertNode(opt.id)}
											<button
												type="button"
												class="btn btn-danger btn-sm"
												disabled={busy}
												onclick={() => confirmRevertNode(opt.id)}
											>Revert…</button>
										{/if}
									</div>
								{:else}
									<p class="pfc__hint">No options on this decision yet — add them on Progression.</p>
								{/each}
							</div>
						{/if}

						{#if playMode && view === 'flow' && flowBundle && (isStartFocus || focus.kind === 'SCENE')}
							<div class="pfc__block pfc__play-path">
								{#if isStartFocus && onSetCurrent && focus.state?.status !== 'ACTIVE' && !REVERT_TERMINAL.has(focus.state?.status ?? '')}
									<div class="pfc__row" style="margin-bottom:0.5rem;">
										<button
											type="button"
											class="btn btn-primary btn-sm"
											disabled={busy}
											onclick={() => setFocusCurrent(flowScene!.id)}
										>Set Start as Current</button>
									</div>
									<p class="pfc__hint">Parks the play cursor on this Start Node (same piece as the scene root) without wiping Taken history.</p>
								{/if}
								<div class="pfc__sub">Paths in this scene</div>
								{#each flowBundle.decisions as d (d.id)}
									<div class="pfc__path-group">
										<button type="button" class="pfc__chip-btn" onclick={() => { selectedPieceId = d.id; selectedCardId = d.id; focusStart = false; }}>
											Decision: {d.title}
										</button>
										{#each d.options as opt (opt.id)}
											{@const st = opt.state?.status ?? 'LOCKED'}
											{@const resolved = st === 'COMPLETED' || st === 'MISSED' || st === 'BLOCKED' || st === 'FAILED'}
											<div class="pfc__path-row pfc__path-row--indent">
												<button
													type="button"
													class="pfc__path-btn"
													class:pfc__path-btn--taken={st === 'COMPLETED'}
													class:pfc__path-btn--missed={st === 'MISSED' || st === 'BLOCKED' || st === 'FAILED'}
													disabled={busy || st === 'COMPLETED'}
													onclick={() => choosePath(opt.id)}
												>
													<span class="pfc__path-btn-title">{opt.title}</span>
													<span class="pfc__path-btn-act">
														{#if st === 'COMPLETED'}Taken{:else if st === 'MISSED'}Missed{:else}They chose this →{/if}
													</span>
												</button>
												{#if resolved && canRevertNode(opt.id)}
													<button
														type="button"
														class="btn btn-danger btn-sm"
														disabled={busy}
														onclick={() => confirmRevertNode(opt.id)}
													>Revert…</button>
												{/if}
											</div>
										{/each}
									</div>
								{:else}
									<p class="pfc__hint">No decisions in this scene. Select an Exit or Discovery below to complete it.</p>
								{/each}
								{#if flowBundle.exits.length}
									<div class="pfc__sub" style="margin-top:0.5rem;">Exits</div>
									{#each flowBundle.exits as x (x.id)}
										{@const xst = x.state?.status ?? 'LOCKED'}
										<div class="pfc__path-row">
											<button
												type="button"
												class="pfc__path-btn"
												class:pfc__path-btn--taken={xst === 'COMPLETED'}
												disabled={busy || xst === 'COMPLETED'}
												onclick={() => { selectedPieceId = x.id; selectedCardId = x.id; focusStart = false; openPlayAdvance('COMPLETED', x.id); }}
											>
												<span class="pfc__path-btn-title">{x.title} →</span>
												<span class="pfc__path-btn-act">They took this exit</span>
											</button>
											{#if REVERT_TERMINAL.has(xst) && canRevertNode(x.id)}
												<button
													type="button"
													class="btn btn-danger btn-sm"
													disabled={busy}
													onclick={() => confirmRevertNode(x.id)}
												>Revert…</button>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						{/if}

						{#if focus.kind !== 'DECISION'}
							<div class="pfc__block">
								<div class="pfc__sub">Also on this piece</div>
								<div class="pfc__row">
									{#if focus.kind === 'DECISION_OPTION'}
										<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => choosePath(focus.id)}>They chose this</button>
									{:else if focus.kind === 'EXIT'}
										<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => openPlayAdvance('COMPLETED')}>They took this exit</button>
									{:else if focus.kind !== 'SCENE'}
										<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => openPlayAdvance('COMPLETED')}>Complete</button>
									{:else}
										<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => openPlayAdvance('COMPLETED')}>Close scene</button>
									{/if}
									{#if !isStartFocus && onSetCurrent && focus.state?.status !== 'ACTIVE' && !REVERT_TERMINAL.has(focus.state?.status ?? '')}
										<button
											type="button"
											class="btn btn-primary btn-sm"
											disabled={busy}
											onclick={() => setFocusCurrent(focus.id)}
										>{focus.kind === 'SCENE' ? 'Set scene as Current' : 'Set as Current'}</button>
									{/if}
									<button type="button" class="btn btn-ghost btn-sm" disabled={busy} onclick={() => openPlayAdvance('FAILED')}>Fail</button>
									<button type="button" class="btn btn-ghost btn-sm" disabled={busy} onclick={() => openPlayAdvance('MISSED')}>Miss</button>
									<button type="button" class="btn btn-ghost btn-sm" disabled={busy} onclick={() => onSetStatus?.(focus.id, 'AVAILABLE')}>Set Available</button>
									<button type="button" class="btn btn-ghost btn-sm" disabled={busy} onclick={() => onSetStatus?.(focus.id, 'BLOCKED')}>Block</button>
									{#if canRevertNode(focus.id)}
										<button type="button" class="btn btn-danger btn-sm" disabled={busy} onclick={() => confirmRevertNode(focus.id)}>Revert step…</button>
									{/if}
								</div>
								<p class="pfc__hint">Path choice above is the main play action. Revert clears this step and every choice after it. Set as Current moves the play cursor without wiping Taken history.</p>
							</div>
						{:else}
							<div class="pfc__block">
								<div class="pfc__row">
									{#if onSetCurrent && focus.state?.status !== 'ACTIVE' && !REVERT_TERMINAL.has(focus.state?.status ?? '')}
										<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => setFocusCurrent(focus.id)}>Set as Current</button>
									{/if}
									{#if canRevertNode(focus.id)}
										<button type="button" class="btn btn-danger btn-sm" disabled={busy} onclick={() => confirmRevertNode(focus.id)}>Revert this decision…</button>
									{/if}
								</div>
								<p class="pfc__hint">Revert clears the choice and every step after it. Set as Current moves the play cursor here.</p>
							</div>
						{/if}
					{/if}
				{/if}

				{#if isStartFocus && flowScene && flowBundle}
					{#if structureEdit}
						<div class="pfc__block">
							<FantasyDateField
								{calendar}
								name="pfc-fail-{flowScene.id}"
								label="Failure time"
								value={flowScene.failureTimeoutDay}
								hint="Optional scene fail date."
								onchange={(day) => onUpdateNode?.({ nodeId: flowScene.id, failureTimeoutDay: day == null ? '' : day })}
							/>
						</div>
					{/if}

					<div class="pfc__block">
						<div class="pfc__sub">Entry requirements</div>
						{#each flowBundle.entry as req (req.id)}
							<div class="pfc__chip">
								{describeEntry(req)}
								{#if structureEdit}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => askDeleteEntry(req.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pfc__hint">None — gated only by graph links.</p>
						{/each}
						{#if structureEdit}
							{#if addingEntry}
								<select class="input input--select" bind:value={entryKind}>
									{#each ENTRY_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
								</select>
								{#if entryKind === 'QUEST_ACCEPTED'}
									<select class="input input--select" bind:value={entryQuestId}>
										<option value="">Quest…</option>
										{#each catalog.quests as q}<option value={q.id}>{q.title}</option>{/each}
									</select>
								{:else if entryKind === 'NPC_ALIVE'}
									<select class="input input--select" bind:value={entryNpcId}>
										<option value="">NPC…</option>
										{#each catalog.npcs as n}<option value={n.id}>{n.name}</option>{/each}
									</select>
								{:else if entryKind === 'OBJECTIVE_COMPLETE'}
									<select class="input input--select" bind:value={entryNodeId}>
										<option value="">Objective…</option>
										{#each catalog.objectiveNodes as o}<option value={o.id}>{o.title}</option>{/each}
									</select>
								{:else if entryKind === 'NODE_COMPLETED'}
									<select class="input input--select" bind:value={entryNodeId}>
										<option value="">Node…</option>
										{#each catalog.allNodes as n}<option value={n.id}>{n.title}</option>{/each}
									</select>
								{:else}
									<input class="input" bind:value={entryNote} placeholder="Note" />
								{/if}
								<input class="input" bind:value={entryLabel} placeholder="Label" />
								<div class="pfc__row">
									<button type="button" class="btn btn-primary btn-sm" onclick={() => submitEntry(flowScene.id)} disabled={busy}>Add</button>
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingEntry = false}>Cancel</button>
								</div>
							{:else}
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingEntry = true}>+ Entry requirement…</button>
							{/if}
						{/if}
					</div>

					<div class="pfc__block">
						<div class="pfc__sub">Scene summary</div>
						<p class="pfc__hint">
							{flowBundle.discoveries.length} discoveries ·
							{flowBundle.encounters.length} encounters ·
							{flowBundle.decisions.length} decisions ·
							{flowBundle.exits.length} exits
						</p>
						{#each outboundFromScene(flowScene.id) as e (e.id)}
							<button type="button" class="pfc__chip-btn" onclick={() => { selectedEdgeId = e.id; selectedPieceId = null; focusStart = false; }}>
								{edgeCaption(e)} → {e.toNodeId ? (byId.get(e.toNodeId)?.title ?? '…') : '…'}
							</button>
						{/each}
					</div>
				{/if}

				{#if view === 'graph' && focus.kind === 'SCENE' && !selectedPiece}
					{@const bundle = sceneBundle(focus.id)}
					<div class="pfc__block">
						<button type="button" class="btn btn-primary btn-sm" onclick={() => openFlow(focus.id)}>{playMode ? 'Open scene flow' : 'Edit scene flow'}</button>
						<p class="pfc__hint" style="margin-top:0.4rem;">
							{bundle.discoveries.length} disc · {bundle.encounters.length} enc · {bundle.decisions.length} dec · {bundle.exits.length} exit
						</p>
						{#each outboundFromScene(focus.id) as e (e.id)}
							<button type="button" class="pfc__chip-btn" onclick={() => { selectedEdgeId = e.id; }}>
								{edgeCaption(e)} → {e.toNodeId ? (byId.get(e.toNodeId)?.title ?? '…') : '…'}
							</button>
						{/each}
					</div>
				{/if}

				{#if selectedPiece?.kind === 'DECISION' && structureEdit}
					<div class="pfc__block">
						<div class="pfc__sub">Options</div>
						{#each childrenOf(selectedPiece.id, 'DECISION_OPTION') as opt (opt.id)}
							<button type="button" class="pfc__chip-btn" onclick={() => { selectedPieceId = opt.id; selectedCardId = opt.id; focusStart = false; }}>
								{opt.title}
							</button>
						{/each}
						<div class="pfc__add-child">
							<input class="input" placeholder="Option title" bind:value={optionTitle} />
							<button type="button" class="btn btn-primary btn-sm" disabled={busy || !optionTitle.trim()} onclick={() => addOption(selectedPiece.id)}>Add option</button>
						</div>
					</div>
				{/if}

				{#if !isGhostFocus && canHaveLinks(focus)}
					<div class="pfc__block">
						<div class="pfc__sub">When “{focus.title}” completes</div>
						<p class="pfc__hint">Unlock or block another piece or another plot. Finish-objective marks that objective done (shown on the card — not a path on the board). Current stays in-scene unless another Unlock jumps away.</p>

						{#if canEdit && onCreateEdge}
							<div class="pfc__quick">
								<span class="pfc__quick-label">Finish objective</span>
								<select
									class="input input--select"
									disabled={busy || !objectives.length}
									onchange={(e) => {
										const id = e.currentTarget.value;
										e.currentTarget.value = '';
										if (id) void quickUnlock(focus.id, id);
									}}
								>
									<option value="">Select objective…</option>
									{#each objectives as o}
										<option value={o.id}>{o.title}</option>
									{/each}
								</select>
								{#if !objectives.length}
									<p class="pfc__hint">No objectives yet — add one on the Objectives tab.</p>
								{/if}

								{#if canQuickContinue}
									<span class="pfc__quick-label">Continue to (this scene)</span>
									<select
										class="input input--select"
										disabled={busy || !continueInSceneTargets.length}
										onchange={(e) => {
											const id = e.currentTarget.value;
											e.currentTarget.value = '';
											if (id) void quickUnlock(focus.id, id);
										}}
									>
										<option value="">Select next piece…</option>
										{#each continueInSceneTargets.filter(t => t.id !== focus.id) as t}
											<option value={t.id}>{kindLabel(t.kind)}: {t.title}</option>
										{/each}
									</select>
									{#if !continueInSceneTargets.filter(t => t.id !== focus.id).length}
										<p class="pfc__hint">Add an Exit, Discovery, or other piece in this scene first.</p>
									{/if}
								{/if}

								{#if focus.kind === 'EXIT' || focus.kind === 'DECISION_OPTION' || focus.kind === 'DECISION'}
									<span class="pfc__quick-label">Go to ending</span>
									<select
										class="input input--select"
										disabled={busy || !endings.length}
										onchange={(e) => {
											const id = e.currentTarget.value;
											e.currentTarget.value = '';
											if (id) void quickUnlock(focus.id, id);
										}}
									>
										<option value="">Select ending…</option>
										{#each endings as en}
											<option value={en.id}>{en.title}</option>
										{/each}
									</select>
									<span class="pfc__quick-label">Go to scene</span>
									<select
										class="input input--select"
										disabled={busy || !scenes.length}
										onchange={(e) => {
											const id = e.currentTarget.value;
											e.currentTarget.value = '';
											if (id) void quickUnlock(focus.id, id);
										}}
									>
										<option value="">Select scene…</option>
										{#each scenes.filter(s => s.id !== focus.id && s.id !== graphCardIdFor(focus.id) && s.id !== flowSceneId) as sc}
											<option value={sc.id}>{sc.title}</option>
										{/each}
									</select>
								{/if}

								{#if focus.kind === 'ENDING'}
									<span class="pfc__quick-label">Open scene</span>
									<select
										class="input input--select"
										disabled={busy || !scenes.length}
										onchange={(e) => {
											const id = e.currentTarget.value;
											e.currentTarget.value = '';
											if (id) void quickUnlock(focus.id, id);
										}}
									>
										<option value="">Select scene…</option>
										{#each scenes as sc}
											<option value={sc.id}>{sc.title}</option>
										{/each}
									</select>
									{#if hasFinishPlotEffect(focus)}
										<p class="pfc__hint">This ending finishes the plot when completed.</p>
									{:else if onCreateEffect}
										<button
											type="button"
											class="btn btn-primary btn-sm"
											disabled={busy}
											onclick={() => addFinishPlotEffect(focus.id)}
										>Finish this plot on complete</button>
									{/if}
								{/if}
							</div>
						{:else if playMode && canEdit && !onCreateEdge}
							<p class="pfc__hint">Finish-objective / go-to links are set on the Progression tab.</p>
						{/if}

						{#each completionEdgesFrom(focus.id) as e (e.id)}
							<div class="pfc__chip">
								<span class="badge">{completionEdgeBadge(e)}</span>
								<strong>{edgeTargetLabel(e)}</strong>
								{#if canEdit && onDeleteEdge}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => askDeleteEdge(e.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pfc__hint">No unlock/block links yet.</p>
						{/each}

						{#if structureEdit || (playMode && canEdit && onCreateEdge)}
							{#if addingLink}
								<select class="input input--select" bind:value={linkKind}>
									{#each COMPLETION_EDGE_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
								</select>
								<div class="pfc__row">
									<button type="button" class="btn btn-sm" class:btn-primary={linkTargetMode === 'node'} class:btn-ghost={linkTargetMode !== 'node'} onclick={() => { linkTargetMode = 'node'; linkToPlotId = ''; }}>In this plot</button>
									<button type="button" class="btn btn-sm" class:btn-primary={linkTargetMode === 'plot'} class:btn-ghost={linkTargetMode !== 'plot'} onclick={() => { linkTargetMode = 'plot'; linkToNodeId = ''; }}>Another plot</button>
								</div>
								{#if linkTargetMode === 'node'}
									<select class="input input--select" bind:value={linkToNodeId}>
										<option value="">Select piece…</option>
										{#each linkTargetNodes.filter(t => t.id !== focus.id) as t}
											<option value={t.id}>{kindLabel(t.kind)}: {t.title}</option>
										{/each}
									</select>
								{:else}
									<select class="input input--select" bind:value={linkToPlotId}>
										<option value="">Select plot quest…</option>
										{#each otherPlots as p}<option value={p.id}>{p.title}</option>{/each}
									</select>
								{/if}
								<div class="pfc__row">
									<button
										type="button"
										class="btn btn-primary btn-sm"
										disabled={busy || (linkTargetMode === 'node' ? !linkToNodeId : !linkToPlotId)}
										onclick={() => submitCompletionLink(focus.id)}
									>Add</button>
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingLink = false}>Cancel</button>
								</div>
							{:else}
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => { addingLink = true; linkKind = 'UNLOCKS'; }} disabled={busy}>
									+ Unlock / Block…
								</button>
							{/if}
						{/if}

						<div class="pfc__sub" style="margin-top:0.65rem;">“{focus.title}” needs</div>
						<p class="pfc__hint">Prerequisites that must be done before this can proceed.</p>
						{#each needsEdgesOf(focus.id) as e (e.id)}
							<div class="pfc__chip">
								<span class="badge">Needs</span>
								<strong>{byId.get(e.fromNodeId)?.title ?? '…'}</strong>
								{#if structureEdit}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => askDeleteEdge(e.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pfc__hint">No prerequisites yet.</p>
						{/each}
						{#if structureEdit}
							{#if addingNeeds}
								<select class="input input--select" bind:value={needsFromId}>
									<option value="">Select piece that must be done first…</option>
									{#each allNodes.filter(t => t.id !== focus.id) as t}
										<option value={t.id}>{kindLabel(t.kind)}: {t.title}</option>
									{/each}
								</select>
								<div class="pfc__row">
									<button type="button" class="btn btn-primary btn-sm" disabled={busy || !needsFromId} onclick={() => submitNeeds(focus.id)}>Add</button>
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingNeeds = false}>Cancel</button>
								</div>
							{:else}
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingNeeds = true} disabled={busy}>+ Needs…</button>
							{/if}
						{/if}
					</div>
				{/if}

				{#if !isGhostFocus && canHaveEffects(focus)}
					<div class="pfc__block">
						<div class="pfc__sub">Consequences</div>
						<p class="pfc__hint">World mutations when this piece completes.</p>
						{#each focus.effects ?? [] as ef (ef.id)}
							<div class="pfc__chip">
								{effectLabelOf(ef)}
								{#if structureEdit}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => askDeleteEffect(ef.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pfc__hint">None yet.</p>
						{/each}
						{#if structureEdit}
							{#if addingEffect}
								<select class="input input--select" bind:value={effectKind}>
									{#each EFFECT_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
								</select>
								{#if effectKind === 'REPUTATION'}
									<select class="input input--select" bind:value={effectFactionId}>
										<option value="">Faction…</option>
										{#each factions as f}<option value={f.id}>{f.name}</option>{/each}
									</select>
									<select class="input input--select" bind:value={effectCharacterId}>
										<option value="">Character…</option>
										{#each characters as c}<option value={c.id}>{c.name}</option>{/each}
									</select>
									<input class="input" type="number" min="-10" max="10" bind:value={effectValue} placeholder="Renown" />
								{:else if effectKind === 'NPC_FLAG'}
									<select class="input input--select" bind:value={effectNpcId}>
										<option value="">NPC…</option>
										{#each catalog.npcs as n}<option value={n.id}>{n.name}</option>{/each}
									</select>
									<select class="input input--select" bind:value={effectNpcStatus}>
										{#each NPC_STATUS_OPTS as s}<option value={s.value}>{s.label}</option>{/each}
									</select>
								{:else if effectKind === 'LOCK_PLOT_QUEST'}
									<select class="input input--select" bind:value={effectLockPlotId}>
										<option value="">Follow-up plot…</option>
										{#each otherPlots as p}<option value={p.id}>{p.title} ({p.status})</option>{/each}
									</select>
								{:else}
									<input class="input" bind:value={effectNote} placeholder="Note" />
								{/if}
								<input class="input" bind:value={effectLabel} placeholder="Short label" />
								<div class="pfc__row">
									<button type="button" class="btn btn-primary btn-sm" onclick={() => submitEffect(focus.id)} disabled={busy}>Add</button>
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingEffect = false}>Cancel</button>
								</div>
							{:else}
								<button type="button" class="btn btn-ghost btn-sm" onclick={openEffectForm} disabled={busy}>+ Consequence…</button>
							{/if}
						{/if}
					</div>
				{/if}

				{#if canDeleteFocus}
					<button
						type="button"
						class="btn btn-danger btn-sm"
						style="margin-top:0.75rem;"
						disabled={busy}
						onclick={() => askDeleteNode(
							isStartFocus && flowScene ? flowScene.id : focus.id,
							isStartFocus && flowScene ? flowScene.title : focus.title,
						)}
					>{isStartFocus ? 'Delete scene' : 'Delete'}</button>
				{/if}
				{#if selectedPiece && view === 'flow'}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => { selectedPieceId = null; focusStart = true; selectedCardId = flowSceneId; }}>Back to Start Node</button>
				{/if}
			{:else}
				<h4>{view === 'flow' ? 'Scene flow' : 'Scene graph'}</h4>
				<p class="pfc__hint">
					{#if view === 'flow'}
						Select the <strong>Start Node</strong> for entry gates, or a Discovery / Decision / Option / Exit for Unlock / Block / Needs / Consequences.
						Use <strong>Connect</strong> to draw progression links.
					{:else}
						<strong>Scene cards</strong> show how the plot connects. Double-click a scene or use <strong>Edit flow</strong> to open its workflow (Start Node → pieces).
						Connect scenes and endings with Unlocks / Blocks / Needs.
					{/if}
				</p>
			{/if}
		</aside>
	</div>
</div>

<style>
	.pfc { display: flex; flex-direction: column; gap: 0.5rem; min-height: 34rem; }
	.pfc--busy { opacity: 0.75; pointer-events: none; }
	.pfc__toolbar, .pfc__palette--bar {
		display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
	}
	.pfc__modes, .pfc__tools, .pfc__row { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
	.pfc__layer-label {
		font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);
		margin-right: 0.35rem;
	}
	.pfc__hint { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
	.pfc__body { display: grid; grid-template-columns: 1fr minmax(17rem, 23rem); gap: 0.65rem; min-height: 30rem; }
	.pfc__body--flow { grid-template-columns: minmax(10rem, 13rem) 1fr minmax(17rem, 23rem); }
	@media (max-width: 1100px) {
		.pfc__body--flow { grid-template-columns: 1fr minmax(16rem, 22rem); }
		.pfc__side-palette { grid-column: 1 / -1; display: flex; flex-direction: row; flex-wrap: wrap; max-height: none; }
	}
	@media (max-width: 960px) {
		.pfc__body { grid-template-columns: 1fr; }
		.pfc__body--flow { grid-template-columns: 1fr; }
	}
	.pfc__side-palette {
		border: 1px solid var(--border-base); border-radius: 0.55rem; padding: 0.65rem;
		background: var(--bg-surface); display: flex; flex-direction: column; gap: 0.35rem;
		max-height: 38rem; overflow: auto;
	}
	.pfc__side-palette .btn { width: 100%; justify-content: center; }
	.pfc__board {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--border-base);
		border-radius: 0.55rem;
		background:
			radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%),
			radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 50%),
			var(--bg-base, var(--bg-surface));
		min-height: 30rem;
		touch-action: none;
		cursor: grab;
	}
	.pfc__board:active { cursor: grabbing; }
	.pfc__empty {
		position: absolute; inset: 0; display: grid; place-items: center; padding: 1.5rem;
		text-align: center; color: var(--text-muted); z-index: 1; pointer-events: none;
	}
	.pfc__world { position: absolute; left: 0; top: 0; width: 2400px; height: 1600px; transform-origin: 0 0; }
	.pfc__edges { position: absolute; inset: 0; overflow: visible; width: 2400px; height: 1600px; pointer-events: none; }
	.pfc__edges :global(.pfc-edge-hit) { pointer-events: stroke; }
	.pfc-edge {
		stroke: var(--accent); stroke-width: 2.5; opacity: 0.9;
	}
	.pfc-edge--parent {
		stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 4 5; opacity: 0.45;
	}
	.pfc-edge--blocks { stroke: var(--color-danger, #c45c4a); }
	.pfc-edge--needs { stroke: var(--color-warning, #c9a227); stroke-dasharray: 6 4; }
	.pfc-edge--on { stroke-width: 3.25; }
	.pfc-edge--paint-taken {
		stroke: #8b5cf6; stroke-width: 3.5; opacity: 1;
		stroke-dasharray: none;
		filter: drop-shadow(0 0 4px color-mix(in srgb, #8b5cf6 55%, transparent));
	}
	.pfc-edge--paint-current {
		stroke: #10b981; stroke-width: 3.75; opacity: 1;
		stroke-dasharray: none;
		filter: drop-shadow(0 0 5px color-mix(in srgb, #10b981 60%, transparent));
	}
	.pfc-edge--paint-available {
		stroke: #22a06b; stroke-width: 2.75; opacity: 0.95; stroke-dasharray: none;
	}
	.pfc-edge--paint-blocked {
		stroke: #ea580c; stroke-width: 2.75; opacity: 0.95; stroke-dasharray: none;
		filter: drop-shadow(0 0 3px color-mix(in srgb, #ea580c 45%, transparent));
	}
	.pfc-edge--paint-locked {
		stroke: #c45c4a; stroke-width: 2.25; opacity: 0.85; stroke-dasharray: 5 5;
	}
	.pfc-edge--paint-unreachable {
		stroke: #8a8f98; stroke-width: 1.75; opacity: 0.45; stroke-dasharray: 5 5;
	}
	.pfc-edge-label {
		fill: var(--text-secondary); font-size: 11px; text-anchor: middle;
		paint-order: stroke; stroke: var(--bg-muted); stroke-width: 3px;
	}
	.pfc__legend { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; margin-right: 0.35rem; }
	.pfc__leg {
		font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
		padding: 0.15rem 0.4rem; border-radius: 0.3rem; border: 1px solid transparent;
	}
	.pfc__leg--taken { color: #8b5cf6; background: color-mix(in srgb, #8b5cf6 14%, transparent); border-color: color-mix(in srgb, #8b5cf6 40%, transparent); }
	.pfc__leg--current { color: #059669; background: color-mix(in srgb, #10b981 18%, transparent); border-color: color-mix(in srgb, #10b981 45%, transparent); }
	.pfc__leg--avail { color: #22a06b; background: color-mix(in srgb, #22a06b 14%, transparent); border-color: color-mix(in srgb, #22a06b 40%, transparent); }
	.pfc__leg--locked { color: #c45c4a; background: color-mix(in srgb, #c45c4a 12%, transparent); border-color: color-mix(in srgb, #c45c4a 35%, transparent); }
	.pfc__leg--blocked { color: #ea580c; background: color-mix(in srgb, #ea580c 14%, transparent); border-color: color-mix(in srgb, #ea580c 40%, transparent); }
	.pfc__leg--gray { color: #8a8f98; background: color-mix(in srgb, #8a8f98 12%, transparent); border-color: color-mix(in srgb, #8a8f98 35%, transparent); }

	.pfc-card {
		position: absolute; width: 12.5rem;
		border: 1px solid var(--border-base); border-radius: 0.55rem;
		background: var(--bg-surface); text-align: left; cursor: grab;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
		padding: 0.5rem 0.6rem 0.55rem;
		display: flex; flex-direction: column; gap: 0.25rem;
		user-select: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		touch-action: none;
	}
	.pfc-card--dragging { cursor: grabbing; z-index: 5; }
	.pfc-card--on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
	.pfc-card--connect { border-color: var(--color-warning, #ef6c00) !important; }
	/* Type colors (always) */
	.pfc-card--start {
		width: 13.5rem;
		border: 2px solid #3d9e6f;
		background: color-mix(in srgb, #3d9e6f 12%, var(--bg-surface));
		box-shadow: 0 0 10px color-mix(in srgb, #3d9e6f 28%, transparent);
	}
	.pfc-card--scene {
		width: 13.5rem;
		border-top: 3px solid #5b8def;
		background: color-mix(in srgb, #5b8def 8%, var(--bg-surface));
	}
	.pfc-card--ending {
		width: 11rem;
		border-top: 3px solid var(--color-danger, #c45c4a);
		background: color-mix(in srgb, var(--color-danger, #c45c4a) 10%, var(--bg-surface));
	}
	.pfc-card--ghost {
		width: 11rem; opacity: 0.85;
		border-style: dashed; background: var(--bg-muted);
		cursor: grab;
	}
	.pfc-card--discovery {
		border-left: 4px solid #0d9488;
		background: color-mix(in srgb, #0d9488 10%, var(--bg-surface));
	}
	.pfc-card--encounter {
		border-left: 4px solid #be185d;
		background: color-mix(in srgb, #be185d 10%, var(--bg-surface));
	}
	.pfc-card--decision {
		border-left: 4px solid #d97706;
		background: color-mix(in srgb, #d97706 10%, var(--bg-surface));
	}
	.pfc-card--decision_option {
		width: 11rem;
		border-left: 4px solid #7c3aed;
		background: color-mix(in srgb, #7c3aed 10%, var(--bg-surface));
	}
	.pfc-card--exit {
		border-left: 4px solid #2563eb;
		background: color-mix(in srgb, #2563eb 10%, var(--bg-surface));
	}
	/* Play path paint overlays type tint */
	.pfc-card--paint-taken {
		outline: 3px solid #8b5cf6;
		box-shadow: 0 0 0 1px #8b5cf6, 0 0 14px color-mix(in srgb, #8b5cf6 45%, transparent);
	}
	.pfc-card--paint-taken .pfc-card__status { color: #8b5cf6; font-weight: 800; }
	.pfc-card--paint-current {
		outline: 3px solid #10b981;
		box-shadow: 0 0 0 2px #10b981, 0 0 16px color-mix(in srgb, #10b981 50%, transparent);
		transform: scale(1.02);
	}
	.pfc-card--paint-current .pfc-card__status { color: #059669; font-weight: 800; }
	.pfc-card--paint-available {
		outline: 2px solid #22a06b;
	}
	.pfc-card--paint-blocked {
		outline: 2px solid #ea580c;
		box-shadow: 0 0 0 1px #ea580c;
		opacity: 0.78;
	}
	.pfc-card--paint-blocked .pfc-card__status { color: #ea580c; font-weight: 800; }
	.pfc-card--paint-locked {
		outline: 2px solid #c45c4a;
		opacity: 0.72;
	}
	.pfc-card--paint-locked .pfc-card__status { color: #c45c4a; font-weight: 800; }
	.pfc-card--paint-unreachable {
		opacity: 0.42; filter: grayscale(0.45);
	}
	.pfc-card__head { display: flex; justify-content: space-between; gap: 0.35rem; align-items: baseline; }
	.pfc-card__kind {
		font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;
		font-weight: 700; color: var(--text-muted);
	}
	.pfc-card__kind--start { color: #3d9e6f; }
	.pfc-card__status { font-size: 0.7rem; color: var(--text-muted); }
	.pfc-card__title { font-size: 0.9rem; font-weight: 700; line-height: 1.25; }
	.pfc-card__meta { font-size: 0.72rem; color: var(--text-muted); }
	.pfc-card__meta.muted { opacity: 0.75; }
	.pfc-card__meta--finish {
		color: color-mix(in srgb, var(--text-secondary, #c4c8d0) 85%, #0d9488);
		font-weight: 600;
	}
	.pfc-card__pill {
		display: inline-block; font-size: 0.65rem; padding: 0.1rem 0.3rem;
		border-radius: 0.25rem; background: var(--bg-muted); margin: 0.1rem 0.15rem 0 0;
	}
	.pfc-card__exit-line {
		font-size: 0.72rem; color: var(--text-secondary);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.pfc-card__edit-flow { margin-top: 0.35rem; align-self: flex-start; }
	.pfc-card__badge {
		display: inline-block; margin-top: 0.15rem; padding: 0 0.3rem;
		border-radius: 0.3rem; background: var(--bg-overlay); font-size: 0.65rem;
		font-weight: 700; color: var(--text-muted); width: fit-content;
	}

	.pfc__inspector {
		border: 1px solid var(--border-base); border-radius: 0.55rem; padding: 0.75rem;
		background: var(--bg-surface); display: flex; flex-direction: column; gap: 0.4rem;
		max-height: 38rem; overflow: auto;
	}
	.pfc__inspector h4 {
		margin: 0; font-size: 0.8rem; text-transform: uppercase;
		letter-spacing: 0.04em; color: var(--text-muted);
	}
	.pfc__title { margin: 0; font-weight: 700; }
	.pfc__textarea { min-height: 5rem; resize: vertical; line-height: 1.4; white-space: pre-wrap; }
	.pfc__block { margin-top: 0.45rem; }
	.pfc__sub {
		font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
		color: var(--text-muted); margin-bottom: 0.25rem;
	}
	.pfc__chip {
		display: flex; gap: 0.35rem; align-items: center; font-size: 0.8rem;
		padding: 0.25rem 0.4rem; border: 1px solid var(--border-base);
		border-radius: 0.35rem; margin-bottom: 0.25rem; background: var(--bg-muted);
	}
	.pfc__chip-btn {
		display: block; width: 100%; text-align: left; font: inherit; font-size: 0.8rem;
		padding: 0.28rem 0.4rem; border: 1px solid var(--border-base); border-radius: 0.35rem;
		margin-bottom: 0.25rem; background: var(--bg-muted); color: inherit; cursor: pointer;
	}
	.pfc__chip-btn:hover { border-color: var(--accent); }
	.pfc__add-child {
		display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; margin: 0.35rem 0 0.5rem;
	}
	.pfc__add-child .input { flex: 1; min-width: 6rem; }
	.pfc__quick {
		display: flex; flex-direction: column; gap: 0.35rem;
		margin-bottom: 0.55rem; padding: 0.5rem;
		border: 1px solid var(--border-base); border-radius: 0.4rem;
		background: var(--bg-muted);
	}
	.pfc__quick-label {
		font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.03em; color: var(--text-muted);
	}
	.badge {
		display: inline-block; padding: 0.1rem 0.35rem; border-radius: 0.3rem;
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		font-size: 0.7rem; font-weight: 700;
	}
	.pfc__play-path {
		padding: 0.55rem;
		border: 1px solid color-mix(in srgb, #3d9e6f 40%, var(--border-base));
		border-radius: 0.45rem;
		background: color-mix(in srgb, #3d9e6f 8%, var(--bg-muted));
	}
	.pfc__path-group { margin-bottom: 0.45rem; }
	.pfc__path-row {
		display: flex; align-items: stretch; gap: 0.35rem; margin-bottom: 0.3rem;
	}
	.pfc__path-row--indent { margin-left: 0.65rem; }
	.pfc__path-row .pfc__path-btn { flex: 1; margin-bottom: 0; min-width: 0; }
	.pfc__path-row .btn { flex-shrink: 0; align-self: center; }
	.pfc__path-btn {
		display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 0.5rem;
		text-align: left; font: inherit; font-size: 0.85rem;
		padding: 0.45rem 0.55rem; margin-bottom: 0.3rem;
		border: 1px solid var(--border-base); border-radius: 0.4rem;
		background: var(--bg-surface); color: inherit; cursor: pointer;
	}
	.pfc__path-btn:hover:not(:disabled) { border-color: #3d9e6f; }
	.pfc__path-btn:disabled { cursor: default; }
	.pfc__path-btn--taken {
		border-color: #3d9e6f;
		background: color-mix(in srgb, #3d9e6f 14%, var(--bg-surface));
	}
	.pfc__path-btn--missed { opacity: 0.55; }
	.pfc__path-btn-title { font-weight: 650; }
	.pfc__path-btn-act { font-size: 0.72rem; font-weight: 700; color: #3d9e6f; white-space: nowrap; }
</style>