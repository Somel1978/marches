<!-- shared/ui/src/world/PlotQuestProgressionEditor.svelte -->
<!-- Product-tree authoring: Objectives / Failure / Progression / Analysis — human labels only. -->
<script lang="ts">
	import FantasyDateField from './FantasyDateField.svelte';
	import PlotFlowchartEditor from './PlotFlowchartEditor.svelte';
	import type { CalendarDef } from './calendar-types.ts';
	import { confirmModal } from '../../components/ui/confirm-modal-singleton.ts';

	let {
		progression,
		calendar,
		canEdit = false,
		onSaved,
	}: {
		progression: {
			plot: { id: string; deadlineDay: number | null; status?: string };
			nodes: any[];
			edges: any[];
			entryReqs: any[];
			flowchartPositions?: Record<string, { posX: number; posY: number }>;
			timeoutDue?: boolean;
			overdueNodeIds?: string[];
			currentDay?: number;
			catalog?: {
				npcs: Array<{ id: string; name: string; status: string }>;
				factions?: Array<{ id: string; name: string }>;
				characters?: Array<{ id: string; name: string }>;
				otherPlots?: Array<{ id: string; title: string; status: string }>;
				quests: Array<{ id: string; title: string; status: string }>;
				plotFactions?: Array<{ id: string; name: string }>;
				plotNpcs?: Array<{ id: string; name: string; status: string }>;
				objectiveNodes: Array<{ id: string; title: string }>;
				allNodes: Array<{ id: string; title: string; kind: string }>;
				scenes?: Array<{ id: string; title: string }>;
				endings?: Array<{ id: string; title: string }>;
			};
			analysis: {
				availableSceneIds: string[];
				impossibleNodeIds: string[];
				entryBlockedSceneIds?: string[];
				unmetEntryReqIds?: string[];
				missedDiscoveryIds: string[];
				possibleEndingIds: string[];
				blockedEndingIds: string[];
				unlockedPlotQuestIds: string[];
				lockedPlotQuestIds: string[];
			};
		};
		calendar: CalendarDef;
		canEdit?: boolean;
		onSaved?: () => void | Promise<void>;
	} = $props();

	type ScenePanel = 'entry' | 'discoveries' | 'decisions' | 'exits' | 'links';

	const STATUS_LABELS: Record<string, string> = {
		LOCKED: 'Locked', AVAILABLE: 'Available', ACTIVE: 'Active',
		COMPLETED: 'Completed', FAILED: 'Failed', MISSED: 'Missed', BLOCKED: 'Blocked',
	};
	const STATUSES = Object.keys(STATUS_LABELS);

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

	/** Effects of completing this piece (outbound). REQUIRES is a prerequisite — separate UI. */
	const COMPLETION_EDGE_OPTS = [
		{ value: 'UNLOCKS', label: 'Unlocks' },
		{ value: 'BLOCKS', label: 'Blocks' },
	] as const;

	const NPC_STATUS_OPTS = [
		{ value: 'ALIVE', label: 'Alive' },
		{ value: 'DEAD', label: 'Dead' },
		{ value: 'MISSING', label: 'Missing' },
		{ value: 'IMPRISONED', label: 'Imprisoned' },
		{ value: 'EXILED', label: 'Exiled' },
	] as const;

	const SCENE_PANELS: Array<{ id: ScenePanel; label: string }> = [
		{ id: 'entry', label: 'Entry' },
		{ id: 'discoveries', label: 'Discoveries' },
		{ id: 'decisions', label: 'Decisions' },
		{ id: 'exits', label: 'Exits' },
		{ id: 'links', label: 'Links' },
	];

	let section = $state<'objectives' | 'failure' | 'progression' | 'endings' | 'play' | 'analysis'>('progression');
	let error = $state('');
	let busy = $state(false);

	let objTitle = $state('');
	let objTier = $state<'PRIMARY' | 'OPTIONAL'>('PRIMARY');
	let objFailDay = $state<number | null>(null);
	let addingObjective = $state(false);

	let failTitle = $state('');
	let addingFailure = $state(false);

	let sceneTitle = $state('');
	let sceneFailDay = $state<number | null>(null);
	let addingScene = $state(false);
	let endingTitle = $state('');
	let addingEnding = $state(false);

	/** Per-scene which card panel is loaded */
	let scenePanelById = $state<Record<string, ScenePanel>>({});

	/** Inline drafts scoped to the card that opened them */
	let draftTitle = $state('');
	let draftDescription = $state('');
	let draftParentId = $state('');

	let addingEntryFor = $state('');
	let entryKind = $state('NPC_ALIVE');
	let entryQuestId = $state('');
	let entryNpcId = $state('');
	let entryNodeId = $state('');
	let entryNote = $state('');
	let entryLabel = $state('');

	let addingEffectFor = $state('');
	let effectKind = $state('NPC_FLAG');
	let effectLabel = $state('');
	let effectFactionId = $state('');
	let effectCharacterId = $state('');
	let effectValue = $state('0');
	let effectNpcId = $state('');
	let effectNpcStatus = $state('DEAD');
	let effectLockPlotId = $state('');
	let effectNote = $state('');

	let connectForId = $state('');
	let edgeKind = $state('UNLOCKS');
	let edgeTo = $state('');
	let edgeToPlot = $state('');
	let edgeTargetMode = $state<'node' | 'plot'>('node');

	/** "This needs…" form — creates REQUIRES from prerequisite → this piece */
	let needsForId = $state('');
	let needsFromId = $state('');

	/** Play tab advance form */
	let advanceForId = $state('');
	let advanceStatus = $state('COMPLETED');
	let advanceDmNote = $state('');
	let advancePlayerNote = $state('');
	let advancePlayerVisible = $state(true);

	const nodes = $derived(progression.nodes ?? []);
	const edges = $derived(progression.edges ?? []);
	const entryReqs = $derived(progression.entryReqs ?? []);
	const analysis = $derived(progression.analysis);
	const catalog = $derived(progression.catalog ?? {
		npcs: [], factions: [], characters: [], otherPlots: [],
		plotFactions: [], plotNpcs: [],
		quests: [], objectiveNodes: [], allNodes: [], scenes: [], endings: [],
	});
	const factions = $derived(catalog.factions ?? []);
	const characters = $derived(catalog.characters ?? []);
	const otherPlots = $derived(catalog.otherPlots ?? []);
	const plotTitleById = $derived.by(() => {
		const m = new Map<string, string>();
		for (const p of otherPlots) m.set(p.id, p.title);
		return m;
	});
	const unmetEntry = $derived(new Set(analysis.unmetEntryReqIds ?? []));
	const entryBlocked = $derived(new Set(analysis.entryBlockedSceneIds ?? []));
	const overdue = $derived(new Set(progression.overdueNodeIds ?? []));

	const objectives = $derived(nodes.filter(n => n.kind === 'OBJECTIVE'));
	const failures = $derived(nodes.filter(n => n.kind === 'FAILURE_CONDITION'));
	const scenes = $derived(nodes.filter(n => n.kind === 'SCENE'));
	const endings = $derived(nodes.filter(n => n.kind === 'ENDING'));

	const titleById = $derived.by(() => {
		const m = new Map<string, string>();
		for (const n of nodes) m.set(n.id, n.title);
		return m;
	});

	const PLAYABLE_KINDS = new Set([
		'SCENE', 'DISCOVERY', 'ENCOUNTER', 'DECISION_OPTION', 'EXIT', 'ENDING', 'OBJECTIVE',
	]);
	const TERMINAL = new Set(['COMPLETED', 'FAILED', 'MISSED', 'BLOCKED']);

	/** Beats open for play (Play tab) */
	const openBeats = $derived(
		nodes.filter(n => {
			if (!PLAYABLE_KINDS.has(n.kind)) return false;
			const s = n.state?.status as string | undefined;
			if (s && TERMINAL.has(s)) return false;
			if (analysis.availableSceneIds.includes(n.id)) return true;
			return s === 'AVAILABLE' || s === 'ACTIVE';
		}),
	);

	const playLog = $derived(
		nodes
			.filter(n => n.state && ['COMPLETED', 'FAILED', 'MISSED'].includes(n.state.status))
			.slice()
			.sort((a, b) => {
				const ta = a.state?.updatedAt ? new Date(a.state.updatedAt).getTime() : 0;
				const tb = b.state?.updatedAt ? new Date(b.state.updatedAt).getTime() : 0;
				return ta - tb;
			}),
	);

	const doneScenes = $derived(
		scenes.filter(n => n.state && ['COMPLETED', 'FAILED', 'MISSED'].includes(n.state.status)),
	);

	function kindLabel(kind: string): string {
		const map: Record<string, string> = {
			OBJECTIVE: 'Objective', FAILURE_CONDITION: 'Failure condition', SCENE: 'Scene',
			DISCOVERY: 'Discovery', ENCOUNTER: 'Encounter', DECISION: 'Decision',
			DECISION_OPTION: 'Option', EXIT: 'Exit', ENDING: 'Ending',
		};
		return map[kind] ?? kind;
	}

	function childrenOf(parentId: string, kind?: string) {
		return nodes.filter(n => n.parentNodeId === parentId && (!kind || n.kind === kind));
	}

	function panelOf(sceneId: string): ScenePanel {
		return scenePanelById[sceneId] ?? 'entry';
	}

	function setPanel(sceneId: string, panel: ScenePanel) {
		scenePanelById = { ...scenePanelById, [sceneId]: panel };
		addingEntryFor = '';
		draftParentId = '';
		draftTitle = '';
		draftDescription = '';
		connectForId = '';
		needsForId = '';
		needsFromId = '';
	}

	function panelCount(sceneId: string, panel: ScenePanel): number {
		if (panel === 'entry') return entryReqs.filter(r => r.sceneNodeId === sceneId).length;
		if (panel === 'discoveries') return childrenOf(sceneId, 'DISCOVERY').length;
		if (panel === 'decisions') return childrenOf(sceneId, 'DECISION').length;
		if (panel === 'exits') return childrenOf(sceneId, 'EXIT').length;
		if (panel === 'links') {
			return completionEdgesFrom(sceneId).length
				+ needsEdges(sceneId).length
				+ neededByEdges(sceneId).length;
		}
		return 0;
	}

	async function post(action: string, fields: Record<string, string | number | null | undefined>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) {
			if (v === undefined || v === null) continue;
			fd.set(k, String(v));
		}
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body: fd,
			headers: { Accept: 'application/json' },
		});
		const text = await res.text();
		let body: { type?: string; data?: { message?: string; workflowGap?: string | null }; message?: string } | null = null;
		try {
			body = text ? JSON.parse(text) : null;
		} catch {
			body = null;
		}
		if (!res.ok) {
			const msg = (body?.data?.message ?? body?.message ?? text) || 'Request failed';
			throw new Error(msg);
		}
		return (body?.data ?? body ?? {}) as Record<string, unknown>;
	}

	let workflowGap = $state('');

	async function run(fn: () => Promise<void | Record<string, unknown>>) {
		busy = true;
		error = '';
		try {
			const data = await fn();
			const gap = data && typeof data === 'object' && 'workflowGap' in data
				? (data as { workflowGap?: string | null }).workflowGap
				: null;
			workflowGap = gap?.trim() || '';
			await onSaved?.();
		} catch (e: any) {
			error = e?.message ?? 'Request failed';
		} finally {
			busy = false;
		}
	}

	function setStatus(nodeId: string, status: string) {
		return run(async () => { await post('setNodeState', { nodeId, status }); });
	}

	function openAdvance(nodeId: string, status: string) {
		advanceForId = nodeId;
		advanceStatus = status;
		advanceDmNote = '';
		advancePlayerNote = '';
		advancePlayerVisible = true;
	}

	function submitAdvance() {
		if (!advanceForId) return;
		const nodeId = advanceForId;
		const status = advanceStatus;
		const note = advanceDmNote;
		const playerNote = advancePlayerNote;
		const playerNoteVisible = advancePlayerVisible && !!advancePlayerNote.trim();
		return run(async () => {
			await post('advanceNode', {
				nodeId,
				status,
				note,
				playerNote,
				playerNoteVisible: playerNoteVisible ? 'true' : 'false',
			});
			advanceForId = '';
			advanceDmNote = '';
			advancePlayerNote = '';
		});
	}

	async function revertPlayLogEntry(nodeId: string) {
		const n = nodes.find(x => x.id === nodeId);
		const title = n?.title ?? 'this step';
		const later = playLog.filter(x => {
			const ta = n?.state?.updatedAt ? new Date(n.state.updatedAt).getTime() : 0;
			const tb = x.state?.updatedAt ? new Date(x.state.updatedAt).getTime() : 0;
			return tb >= ta;
		});
		const sample = later.slice(0, 6).map(x => x.title).join(', ');
		const more = later.length > 6 ? '…' : '';
		const ok = await confirmModal(
			'Revert this step?',
			`This clears “${title}” and every choice after it (${later.length} log beat${later.length === 1 ? '' : 's'}), `
			+ 'wipes their play notes, and restores Current on that step. '
			+ 'World effects already applied (renown, NPC flags, locked plots) are NOT undone.\n\n'
			+ `Clears: ${sample}${more}\n\n`
			+ 'This cannot be undone automatically.',
		);
		if (!ok) return;
		return run(async () => { await post('revertNode', { nodeId }); });
	}

	async function removeNode(id: string) {
		const ok = await confirmModal('Delete piece?', 'Delete this item and its children? This cannot be undone.');
		if (!ok) return;
		return run(async () => { await post('deleteNode', { nodeId: id }); });
	}

	function saveFailDay(nodeId: string, day: number | null) {
		return run(async () => {
			await post('updateNode', {
				nodeId,
				failureTimeoutDay: day == null ? '' : day,
			});
		});
	}

	function saveDescription(nodeId: string, description: string) {
		return run(async () => {
			await post('updateNode', { nodeId, description });
		});
	}

	function openAddObjective() {
		addingObjective = true;
		objTitle = '';
		objTier = 'PRIMARY';
		objFailDay = null;
	}

	function addObjective() {
		return run(async () => {
			await post('createNode', {
				kind: 'OBJECTIVE',
				title: objTitle,
				objectiveTier: objTier,
				failureTimeoutDay: objFailDay == null ? '' : objFailDay,
			});
			objTitle = '';
			objFailDay = null;
			addingObjective = false;
		});
	}

	function openAddFailure() {
		addingFailure = true;
		failTitle = '';
	}

	function addFailure() {
		return run(async () => {
			await post('createNode', { kind: 'FAILURE_CONDITION', title: failTitle });
			failTitle = '';
			addingFailure = false;
		});
	}

	function openAddScene() {
		addingScene = true;
		sceneTitle = '';
		sceneFailDay = null;
	}

	function addScene() {
		return run(async () => {
			await post('createNode', {
				kind: 'SCENE',
				title: sceneTitle,
				failureTimeoutDay: sceneFailDay == null ? '' : sceneFailDay,
			});
			sceneTitle = '';
			sceneFailDay = null;
			addingScene = false;
		});
	}

	function openAddEnding() {
		addingEnding = true;
		endingTitle = '';
	}

	function addEnding() {
		return run(async () => {
			await post('createNode', { kind: 'ENDING', title: endingTitle });
			endingTitle = '';
			addingEnding = false;
		});
	}

	function openDraft(parentId: string) {
		draftParentId = parentId;
		draftTitle = '';
		draftDescription = '';
	}

	function addChildDraft(kind: string) {
		if (!draftParentId || !draftTitle.trim()) return;
		const parent = draftParentId;
		const title = draftTitle.trim();
		const description = draftDescription.trim();
		const withDesc = kind === 'DISCOVERY' || kind === 'ENCOUNTER' || kind === 'DECISION' || kind === 'EXIT';
		return run(async () => {
			await post('createNode', {
				kind,
				title,
				parentNodeId: parent,
				...(withDesc ? { description } : {}),
			});
			draftTitle = '';
			draftDescription = '';
			draftParentId = '';
		});
	}

	function cancelDraft() {
		draftParentId = '';
		draftTitle = '';
		draftDescription = '';
	}

	function openEntryForm(sceneId: string) {
		addingEntryFor = sceneId;
		addingEffectFor = '';
		entryKind = 'NPC_ALIVE';
		entryQuestId = '';
		entryNpcId = '';
		entryNodeId = '';
		entryNote = '';
		entryLabel = '';
	}

	function entryPayload(): string {
		if (entryKind === 'QUEST_ACCEPTED') return JSON.stringify({ questId: entryQuestId });
		if (entryKind === 'NPC_ALIVE') return JSON.stringify({ npcId: entryNpcId });
		if (entryKind === 'NODE_COMPLETED' || entryKind === 'OBJECTIVE_COMPLETE') {
			return JSON.stringify({ nodeId: entryNodeId });
		}
		return JSON.stringify({ note: entryNote });
	}

	function addEntry() {
		const sceneId = addingEntryFor;
		return run(async () => {
			await post('createEntryReq', {
				sceneNodeId: sceneId,
				kind: entryKind,
				label: entryLabel,
				payload: entryPayload(),
			});
			addingEntryFor = '';
			entryLabel = '';
			entryNote = '';
		});
	}

	async function removeEntry(id: string) {
		const ok = await confirmModal('Remove entry requirement?', 'Remove this entry requirement from the scene?');
		if (!ok) return;
		return run(async () => { await post('deleteEntryReq', { entryReqId: id }); });
	}

	function openEffectForm(ownerId: string) {
		addingEffectFor = ownerId;
		addingEntryFor = '';
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

	function addEffect() {
		const owner = addingEffectFor;
		return run(async () => {
			await post('createEffect', {
				ownerNodeId: owner,
				kind: effectKind,
				label: effectLabel,
				payload: effectPayload(),
			});
			addingEffectFor = '';
			effectLabel = '';
			effectNote = '';
		});
	}

	async function removeEffect(id: string) {
		const ok = await confirmModal('Remove consequence?', 'Remove this consequence?');
		if (!ok) return;
		return run(async () => { await post('deleteEffect', { effectId: id }); });
	}

	function openConnect(nodeId: string) {
		connectForId = nodeId;
		needsForId = '';
		edgeKind = 'UNLOCKS';
		edgeTo = '';
		edgeToPlot = '';
		edgeTargetMode = 'node';
	}

	function openNeeds(nodeId: string) {
		needsForId = nodeId;
		connectForId = '';
		needsFromId = '';
	}

	function addConnectionFrom(fromId: string) {
		return run(async () => {
			await post('createEdge', {
				kind: edgeKind,
				fromNodeId: fromId,
				toNodeId: edgeTargetMode === 'node' ? edgeTo : '',
				toPlotQuestId: edgeTargetMode === 'plot' ? edgeToPlot : '',
			});
			connectForId = '';
			edgeTo = '';
			edgeToPlot = '';
		});
	}

	/** Graph: to-node REQUIRES from-node — "this needs prerequisite". */
	function addNeeds(ownerId: string) {
		if (!needsFromId) return;
		return run(async () => {
			await post('createEdge', {
				kind: 'REQUIRES',
				fromNodeId: needsFromId,
				toNodeId: ownerId,
			});
			needsForId = '';
			needsFromId = '';
		});
	}

	async function removeEdge(id: string) {
		const ok = await confirmModal('Remove link?', 'Remove this Unlocks / Blocks / Needs link?');
		if (!ok) return;
		return run(async () => { await post('deleteEdge', { edgeId: id }); });
	}

	async function applyDeadline() {
		const ok = await confirmModal(
			'Apply deadline failure?',
			'This completes failure conditions and marks the plot Failed.',
		);
		if (!ok) return;
		return run(async () => { await post('applyFailureTimeout', {}); });
	}

	async function applyNodeTimeouts() {
		const ok = await confirmModal('Mark overdue as failed?', 'Mark overdue scenes/objectives as Failed?');
		if (!ok) return;
		return run(async () => { await post('applyNodeTimeouts', {}); });
	}

	function describeEntry(req: any): string {
		const p = req.payload && typeof req.payload === 'object' ? req.payload : {};
		const kind = ENTRY_OPTS.find(o => o.value === req.kind)?.label ?? req.kind;
		if (req.kind === 'QUEST_ACCEPTED') {
			const q = catalog.quests.find(x => x.id === p.questId);
			return `${kind}: ${q?.title ?? p.questId ?? '?'}`;
		}
		if (req.kind === 'NPC_ALIVE') {
			const n = catalog.npcs.find(x => x.id === p.npcId);
			return `${kind}: ${n ? `${n.name} (${n.status})` : (p.npcId ?? '?')}`;
		}
		if (req.kind === 'NODE_COMPLETED' || req.kind === 'OBJECTIVE_COMPLETE') {
			return `${kind}: ${titleById.get(p.nodeId) ?? p.nodeId ?? '?'}`;
		}
		return req.label || kind;
	}

	function effectLabelOf(ef: any): string {
		return ef.label || EFFECT_OPTS.find(o => o.value === ef.kind)?.label || ef.kind;
	}

	function completionEdgesFrom(nodeId: string) {
		return edges.filter(e => e.fromNodeId === nodeId && (e.kind === 'UNLOCKS' || e.kind === 'BLOCKS'));
	}

	/** Incoming REQUIRES: this piece needs these prerequisites done first. */
	function needsEdges(nodeId: string) {
		return edges.filter(e => e.toNodeId === nodeId && e.kind === 'REQUIRES');
	}

	/** Outbound REQUIRES (legacy / "others need this"): this must finish before the target. */
	function neededByEdges(nodeId: string) {
		return edges.filter(e => e.fromNodeId === nodeId && e.kind === 'REQUIRES');
	}

	function edgeTargetLabel(e: any): string {
		if (e.toPlotQuestId) return `plot ${plotTitleById.get(e.toPlotQuestId) ?? '…'}`;
		return titleById.get(e.toNodeId) ?? '…';
	}
</script>

<div class="pqe card">
	<div class="page__header" style="margin-bottom:0.75rem;">
		<div>
			<h3 class="section-title" style="margin:0;">Plot structure</h3>
			<p class="field-hint" style="margin:0.25rem 0 0;">
				Objectives, failure, progression flowchart, and endings. Progression is drawn as a flowchart; Neural Progression is the world overview.
			</p>
		</div>
	</div>

	{#if progression.timeoutDue}
		<div class="form-error" style="margin-bottom:0.75rem;">
			Plot deadline is due (day {progression.currentDay} ≥ {progression.plot.deadlineDay}).
			{#if canEdit}
				<button type="button" class="btn btn-danger btn-sm" style="margin-left:0.5rem;" onclick={applyDeadline} disabled={busy}>
					Apply deadline failure
				</button>
			{/if}
		</div>
	{/if}

	{#if overdue.size > 0}
		<div class="form-error" style="margin-bottom:0.75rem;">
			{overdue.size} scene(s)/objective(s) past their failure time.
			{#if canEdit}
				<button type="button" class="btn btn-danger btn-sm" style="margin-left:0.5rem;" onclick={applyNodeTimeouts} disabled={busy}>
					Mark overdue as failed
				</button>
			{/if}
		</div>
	{/if}

	{#if error}<p class="form-error">{error}</p>{/if}
	{#if workflowGap}<p class="form-error" role="status">{workflowGap}</p>{/if}

	<div class="pqe__tabs">
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'objectives'} class:btn-ghost={section !== 'objectives'} onclick={() => section = 'objectives'}>Objectives</button>
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'failure'} class:btn-ghost={section !== 'failure'} onclick={() => section = 'failure'}>Failure</button>
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'progression'} class:btn-ghost={section !== 'progression'} onclick={() => section = 'progression'}>Progression</button>
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'endings'} class:btn-ghost={section !== 'endings'} onclick={() => section = 'endings'}>Endings</button>
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'play'} class:btn-ghost={section !== 'play'} onclick={() => section = 'play'}>Play</button>
		<button type="button" class="btn btn-sm" class:btn-primary={section === 'analysis'} class:btn-ghost={section !== 'analysis'} onclick={() => section = 'analysis'}>Analysis</button>
	</div>

	<!-- ═══ OBJECTIVES ═══ -->
	{#if section === 'objectives'}
		<ul class="pqe__list">
			{#each objectives as n (n.id)}
				<li class="pqe__card">
					<div class="pqe__card-head">
						<strong>{n.title}</strong>
						<span class="badge badge-muted">{n.objectiveTier === 'OPTIONAL' ? 'Optional' : 'Primary'}</span>
						<span class="badge">{STATUS_LABELS[n.state?.status] ?? n.state?.status ?? 'Locked'}</span>
						{#if overdue.has(n.id)}<span class="badge badge-warning">Overdue</span>{/if}
						{#if canEdit}
							<select class="input input--select" style="width:auto;" value={n.state?.status ?? 'LOCKED'} onchange={(e) => setStatus(n.id, e.currentTarget.value)} disabled={busy}>
								{#each STATUSES as s}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
							</select>
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeNode(n.id)} disabled={busy}>Delete</button>
						{/if}
					</div>
					{#if canEdit}
						<div class="pqe__card-body">
							<FantasyDateField
								{calendar}
								name="objFail-{n.id}"
								label="Failure time"
								value={n.failureTimeoutDay}
								hint="Optional — fails this objective when the world day reaches this date (separate from plot deadline)."
								onchange={(day) => saveFailDay(n.id, day)}
							/>
						</div>
					{:else if n.failureTimeoutDay != null}
						<p class="pqe__muted">Failure time: day {n.failureTimeoutDay}</p>
					{/if}
				</li>
			{/each}
		</ul>
		{#if !objectives.length}<p class="table__empty">No objectives yet.</p>{/if}

		{#if canEdit}
			{#if addingObjective}
				<div class="pqe__form-card" style="margin-top:0.75rem; max-width:none;">
					<div class="pqe__panel-label">New objective</div>
					<div class="fields">
						<div class="field">
							<label class="label" for="ot">Title</label>
							<input id="ot" class="input" bind:value={objTitle} />
						</div>
						<div class="field">
							<label class="label" for="otr">Tier</label>
							<select id="otr" class="input input--select" bind:value={objTier}>
								<option value="PRIMARY">Primary</option>
								<option value="OPTIONAL">Optional</option>
							</select>
						</div>
						<div class="field" style="grid-column:1 / -1;">
							<FantasyDateField
								{calendar}
								name="newObjFail"
								label="Failure time"
								bind:value={objFailDay}
								hint="Optional — separate from the plot deadline."
							/>
						</div>
					</div>
					<div class="pqe__inline-add">
						<button type="button" class="btn btn-primary btn-sm" onclick={addObjective} disabled={busy || !objTitle.trim()}>Add</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => { addingObjective = false; objTitle = ''; objFailDay = null; }}>Cancel</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn btn-ghost btn-sm" style="margin-top:0.75rem;" onclick={openAddObjective} disabled={busy}>
					+ Objective…
				</button>
			{/if}
		{/if}

	<!-- ═══ FAILURE ═══ -->
	{:else if section === 'failure'}
		<p class="field-hint" style="margin-top:0;">
			Global fail timer is the plot <strong>Deadline</strong> in Summary
			({progression.plot.deadlineDay == null ? 'not set' : `day ${progression.plot.deadlineDay}`}).
			Consequences are added on each failure-condition card.
		</p>
		<ul class="pqe__list">
			{#each failures as n (n.id)}
				<li class="pqe__card">
					<div class="pqe__card-head">
						<strong>{n.title}</strong>
						<span class="badge">{STATUS_LABELS[n.state?.status] ?? 'Locked'}</span>
						{#if canEdit}
							<select class="input input--select" style="width:auto;" value={n.state?.status ?? 'LOCKED'} onchange={(e) => setStatus(n.id, e.currentTarget.value)} disabled={busy}>
								{#each STATUSES as s}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
							</select>
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeNode(n.id)} disabled={busy}>Delete</button>
						{/if}
					</div>
					<div class="pqe__card-body">
						<div class="pqe__panel-label">Consequences</div>
						{#each n.effects ?? [] as ef (ef.id)}
							<div class="pqe__chip">
								{effectLabelOf(ef)}
								{#if canEdit}
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEffect(ef.id)} disabled={busy}>×</button>
								{/if}
							</div>
						{:else}
							<p class="pqe__muted">No consequences yet.</p>
						{/each}
						{#if canEdit}
							{#if addingEffectFor === n.id}
								{@render effectForm()}
							{:else}
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => openEffectForm(n.id)} disabled={busy}>
									+ Add consequence…
								</button>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
		{#if !failures.length}<p class="table__empty">No failure conditions yet.</p>{/if}

		{#if canEdit}
			{#if addingFailure}
				<div class="pqe__form-card" style="margin-top:0.75rem; max-width:none;">
					<div class="pqe__panel-label">New failure condition</div>
					<div class="fields">
						<div class="field" style="grid-column:1 / -1;">
							<label class="label" for="ft">Title</label>
							<input id="ft" class="input" bind:value={failTitle} placeholder="e.g. The prisoner dies" />
						</div>
					</div>
					<div class="pqe__inline-add">
						<button type="button" class="btn btn-primary btn-sm" onclick={addFailure} disabled={busy || !failTitle.trim()}>Add</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => { addingFailure = false; failTitle = ''; }}>Cancel</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn btn-ghost btn-sm" style="margin-top:0.75rem;" onclick={openAddFailure} disabled={busy}>
					+ Failure condition…
				</button>
			{/if}
		{/if}

	<!-- ═══ PROGRESSION ═══ -->
	{:else if section === 'progression'}
		<p class="field-hint" style="margin-top:0;">
			Scene graph links scenes and endings. Open a scene’s flow to edit Start Node, discoveries, decisions, and exits.
			Play uses the same canvases to mark what the party took.
		</p>
		<PlotFlowchartEditor
			nodes={nodes}
			edges={edges}
			entryReqs={entryReqs}
			positions={progression.flowchartPositions ?? {}}
			{calendar}
			catalog={catalog}
			{canEdit}
			{busy}
			onCreateNode={(input) => run(async () => {
				await post('createNode', {
					kind: input.kind,
					title: input.title,
					parentNodeId: input.parentNodeId ?? '',
					description: input.description ?? '',
					encounterKind: input.encounterKind ?? '',
					socialFactionId: input.socialFactionId ?? '',
					socialNpcId: input.socialNpcId ?? '',
				});
			})}
			onUpdateNode={(input) => run(async () => { await post('updateNode', input); })}
			onDeleteNode={(nodeId) => run(async () => { await post('deleteNode', { nodeId }); })}
			onSetStatus={(nodeId, status) => setStatus(nodeId, status)}
			onCreateEdge={(input) => run(async () => {
				await post('createEdge', {
					kind: input.kind,
					fromNodeId: input.fromNodeId,
					toNodeId: input.toNodeId ?? '',
					toPlotQuestId: input.toPlotQuestId ?? '',
				});
			})}
			onDeleteEdge={(edgeId) => run(async () => { await post('deleteEdge', { edgeId }); })}
			onMoveNode={(nodeId, pos) => run(async () => {
				await post('moveFlowchartNode', { nodeId, posX: pos.posX, posY: pos.posY });
			})}
			onRelayout={() => run(async () => { await post('relayoutProgression', {}); })}
			onCreateEntry={(input) => run(async () => { await post('createEntryReq', input); })}
			onDeleteEntry={(id) => run(async () => { await post('deleteEntryReq', { entryReqId: id }); })}
			onCreateEffect={(input) => run(async () => { await post('createEffect', input); })}
			onDeleteEffect={(id) => run(async () => { await post('deleteEffect', { effectId: id }); })}
		/>

	<!-- ═══ ENDINGS ═══ -->
	{:else if section === 'endings'}
		<p class="field-hint" style="margin-top:0;">
			Plot terminals for the whole quest (not tied to a single scene). Add unlocks/blocks on each ending
			(e.g. Success unlocks a follow-up plot).
		</p>
		<ul class="pqe__list">
			{#each endings as ending (ending.id)}
				<li>
					{@render pieceBlock(ending, true)}
				</li>
			{/each}
		</ul>
		{#if !endings.length}<p class="table__empty">No endings yet.</p>{/if}

		{#if canEdit}
			{#if addingEnding}
				<div class="pqe__form-card" style="margin-top:0.75rem; max-width:none;">
					<div class="pqe__panel-label">New ending</div>
					<div class="fields">
						<div class="field" style="grid-column:1 / -1;">
							<label class="label" for="et">Title</label>
							<input id="et" class="input" bind:value={endingTitle} placeholder="e.g. Success" />
						</div>
					</div>
					<div class="pqe__inline-add">
						<button type="button" class="btn btn-primary btn-sm" onclick={addEnding} disabled={busy || !endingTitle.trim()}>Add</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => { addingEnding = false; endingTitle = ''; }}>Cancel</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn btn-ghost btn-sm" style="margin-top:0.75rem;" onclick={openAddEnding} disabled={busy}>
					+ Ending…
				</button>
			{/if}
		{/if}

	<!-- ═══ PLAY ═══ -->
	{:else if section === 'play'}
		<p class="field-hint" style="margin-top:0;">
			Open a scene → <strong>Which path did they take?</strong> (Yes/No counts even without Unlocks).
			Records Taken / Missed / closes the decision, then moves <strong>Current</strong> forward
			(Unlocks edges if any, otherwise next exits/pieces in the scene).
			<strong>Revert…</strong> undoes a step and every choice after it (confirm required).
		</p>
		{#if progression.plot.status === 'DRAFT'}
			<p class="field-hint" style="margin:0 0 0.65rem;">
				<strong>Draft</strong> — fine for testing scenes here. Set the plot to <strong>Active</strong> in Summary when you go live with players (hides drafts from the player plot log).
			</p>
		{/if}
		<PlotFlowchartEditor
			nodes={nodes}
			edges={edges}
			entryReqs={entryReqs}
			positions={progression.flowchartPositions ?? {}}
			{calendar}
			catalog={catalog}
			{canEdit}
			{busy}
			playMode={true}
			analysis={analysis}
			onSetStatus={(nodeId, status) => setStatus(nodeId, status)}
			onAdvanceNode={(input) => run(async () => {
				return await post('advanceNode', {
					nodeId: input.nodeId,
					status: input.status,
					note: input.note ?? '',
					playerNote: input.playerNote ?? '',
					playerNoteVisible: input.playerNoteVisible ? 'true' : 'false',
					missSiblingIds: (input.missSiblingIds ?? []).join(','),
				});
			})}
			onRevertNode={(nodeId) => run(async () => {
				await post('revertNode', { nodeId });
			})}
			onSetCurrent={(nodeId) => run(async () => {
				await post('setNodeCurrent', { nodeId });
			})}
			onCreateEdge={(input) => run(async () => {
				await post('createEdge', {
					kind: input.kind,
					fromNodeId: input.fromNodeId,
					toNodeId: input.toNodeId ?? '',
					toPlotQuestId: input.toPlotQuestId ?? '',
				});
			})}
			onDeleteEdge={(edgeId) => run(async () => { await post('deleteEdge', { edgeId }); })}
			onCreateEffect={(input) => run(async () => { await post('createEffect', input); })}
			onDeleteEffect={(id) => run(async () => { await post('deleteEffect', { effectId: id }); })}
			onMoveNode={(nodeId, pos) => run(async () => {
				await post('moveFlowchartNode', { nodeId, posX: pos.posX, posY: pos.posY });
			})}
		/>
		<div class="pqe__panel-label" style="margin-top:1.25rem;">Log so far ({playLog.length})</div>
		{#if !playLog.length}
			<p class="pqe__muted">No completed / failed / missed beats yet.</p>
		{/if}
		<ul class="pqe__list">
			{#each playLog as n (n.id)}
				<li class="pqe__card">
					<div class="pqe__card-head">
						<strong>{kindLabel(n.kind)} · {n.title}</strong>
						<span class="badge">{STATUS_LABELS[n.state?.status]}</span>
						{#if n.state?.playerNoteVisible}<span class="badge badge-success">Player visible</span>{/if}
						{#if canEdit}
							<button
								type="button"
								class="btn btn-danger btn-sm"
								disabled={busy}
								onclick={() => revertPlayLogEntry(n.id)}
							>Revert…</button>
						{/if}
					</div>
					{#if n.state?.note}
						<p class="pqe__muted">DM: {n.state.note}</p>
					{/if}
					{#if n.state?.playerNote}
						<p class="pqe__desc-text">{n.state.playerNote}</p>
					{/if}
				</li>
			{/each}
		</ul>

	<!-- ═══ ANALYSIS ═══ -->
	{:else}
		<p class="field-hint" style="margin-top:0;">
			Live graph readout. Open scenes are playable now; endings may stay empty until an unlocker is completed.
		</p>
		<div class="pqe__analysis">
			<div>
				<h4>Open scenes ({analysis.availableSceneIds.length})</h4>
				{#if analysis.availableSceneIds.length}
					<ul class="pqe__name-list">
						{#each analysis.availableSceneIds as id}
							<li>{titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None open — mark a scene Available/Active, or complete a beat that unlocks one.</p>
				{/if}
			</div>
			<div>
				<h4>Scenes already done ({doneScenes.length})</h4>
				{#if doneScenes.length}
					<ul class="pqe__name-list">
						{#each doneScenes as n}
							<li>{n.title} · {STATUS_LABELS[n.state?.status]}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">No scenes completed, failed, or missed yet.</p>
				{/if}
			</div>
			<div>
				<h4>Entry-blocked scenes ({(analysis.entryBlockedSceneIds ?? []).length})</h4>
				{#if (analysis.entryBlockedSceneIds ?? []).length}
					<ul class="pqe__name-list">
						{#each analysis.entryBlockedSceneIds ?? [] as id}
							<li>{titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None.</p>
				{/if}
			</div>
			<div>
				<h4>Possible endings ({analysis.possibleEndingIds.length})</h4>
				{#if analysis.possibleEndingIds.length}
					<ul class="pqe__name-list">
						{#each analysis.possibleEndingIds as id}
							<li>{titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None reachable yet — complete an unlocker, or add an ungated ending.</p>
				{/if}
			</div>
			<div>
				<h4>Blocked endings ({(analysis.blockedEndingIds ?? []).length})</h4>
				{#if (analysis.blockedEndingIds ?? []).length}
					<ul class="pqe__name-list">
						{#each analysis.blockedEndingIds ?? [] as id}
							<li>{titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None.</p>
				{/if}
			</div>
			<div>
				<h4>Impossible / blocked pieces ({analysis.impossibleNodeIds.length})</h4>
				{#if analysis.impossibleNodeIds.length}
					<ul class="pqe__name-list">
						{#each analysis.impossibleNodeIds as id}
							<li>{kindLabel(nodes.find(n => n.id === id)?.kind ?? '')}: {titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None.</p>
				{/if}
			</div>
			<div>
				<h4>Missed discoveries ({analysis.missedDiscoveryIds.length})</h4>
				{#if analysis.missedDiscoveryIds.length}
					<ul class="pqe__name-list">
						{#each analysis.missedDiscoveryIds as id}
							<li>{titleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None marked missed or impossible.</p>
				{/if}
			</div>
			<div>
				<h4>Unlocked follow-up plots ({analysis.unlockedPlotQuestIds.length})</h4>
				{#if analysis.unlockedPlotQuestIds.length}
					<ul class="pqe__name-list">
						{#each analysis.unlockedPlotQuestIds as id}
							<li>{plotTitleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None (complete an Unlocks→plot link).</p>
				{/if}
			</div>
			<div>
				<h4>Locked follow-up plots ({analysis.lockedPlotQuestIds.length})</h4>
				{#if analysis.lockedPlotQuestIds.length}
					<ul class="pqe__name-list">
						{#each analysis.lockedPlotQuestIds as id}
							<li>{plotTitleById.get(id) ?? id}</li>
						{/each}
					</ul>
				{:else}
					<p class="pqe__muted">None.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#snippet entryForm()}
	<div class="pqe__form-card">
		<div class="fields">
			<div class="field">
				<label class="label" for="ekind">Type</label>
				<select id="ekind" class="input input--select" bind:value={entryKind}>
					{#each ENTRY_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
				</select>
			</div>
			{#if entryKind === 'QUEST_ACCEPTED'}
				<div class="field">
					<label class="label" for="eq">Linked quest</label>
					<select id="eq" class="input input--select" bind:value={entryQuestId}>
						<option value="">Select…</option>
						{#each catalog.quests as q}<option value={q.id}>{q.title}</option>{/each}
					</select>
				</div>
			{:else if entryKind === 'NPC_ALIVE'}
				<div class="field">
					<label class="label" for="en">NPC</label>
					<select id="en" class="input input--select" bind:value={entryNpcId}>
						<option value="">Select…</option>
						{#each catalog.npcs as n}<option value={n.id}>{n.name}</option>{/each}
					</select>
				</div>
			{:else if entryKind === 'OBJECTIVE_COMPLETE'}
				<div class="field">
					<label class="label" for="eo">Objective</label>
					<select id="eo" class="input input--select" bind:value={entryNodeId}>
						<option value="">Select…</option>
						{#each catalog.objectiveNodes as o}<option value={o.id}>{o.title}</option>{/each}
					</select>
				</div>
			{:else if entryKind === 'NODE_COMPLETED'}
				<div class="field">
					<label class="label" for="enode">Node</label>
					<select id="enode" class="input input--select" bind:value={entryNodeId}>
						<option value="">Select…</option>
						{#each catalog.allNodes as n}<option value={n.id}>{kindLabel(n.kind)}: {n.title}</option>{/each}
					</select>
				</div>
			{:else}
				<div class="field">
					<label class="label" for="ec">Note</label>
					<input id="ec" class="input" bind:value={entryNote} />
				</div>
			{/if}
			<div class="field">
				<label class="label" for="el">Label</label>
				<input id="el" class="input" bind:value={entryLabel} />
			</div>
		</div>
		<div class="pqe__inline-add">
			<button type="button" class="btn btn-primary btn-sm" onclick={addEntry} disabled={busy}>Add</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingEntryFor = ''}>Cancel</button>
		</div>
	</div>
{/snippet}

{#snippet effectForm()}
	<div class="pqe__form-card">
		<div class="fields">
			<div class="field">
				<label class="label" for="efk">Type</label>
				<select id="efk" class="input input--select" bind:value={effectKind}>
					{#each EFFECT_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
				</select>
			</div>
			{#if effectKind === 'REPUTATION'}
				<div class="field">
					<label class="label" for="eff">Faction</label>
					<select id="eff" class="input input--select" bind:value={effectFactionId}>
						<option value="">Select…</option>
						{#each factions as f}<option value={f.id}>{f.name}</option>{/each}
					</select>
					{#if !factions.length}<p class="field-hint">No factions in this world yet.</p>{/if}
				</div>
				<div class="field">
					<label class="label" for="efc">Character</label>
					<select id="efc" class="input input--select" bind:value={effectCharacterId}>
						<option value="">Select…</option>
						{#each characters as c}<option value={c.id}>{c.name}</option>{/each}
					</select>
					{#if !characters.length}<p class="field-hint">No characters assigned to this world yet.</p>{/if}
				</div>
				<div class="field">
					<label class="label" for="efv">Renown (−10…10)</label>
					<input id="efv" class="input" type="number" min="-10" max="10" bind:value={effectValue} />
				</div>
			{:else if effectKind === 'NPC_FLAG'}
				<div class="field">
					<label class="label" for="efn">NPC</label>
					<select id="efn" class="input input--select" bind:value={effectNpcId}>
						<option value="">Select…</option>
						{#each catalog.npcs as n}<option value={n.id}>{n.name}</option>{/each}
					</select>
					{#if !catalog.npcs.length}<p class="field-hint">No NPCs in this world yet.</p>{/if}
				</div>
				<div class="field">
					<label class="label" for="efs">New status</label>
					<select id="efs" class="input input--select" bind:value={effectNpcStatus}>
						{#each NPC_STATUS_OPTS as s}<option value={s.value}>{s.label}</option>{/each}
					</select>
				</div>
			{:else if effectKind === 'LOCK_PLOT_QUEST'}
				<div class="field">
					<label class="label" for="efp">Follow-up plot quest</label>
					<select id="efp" class="input input--select" bind:value={effectLockPlotId}>
						<option value="">Select…</option>
						{#each otherPlots as p}<option value={p.id}>{p.title} ({p.status})</option>{/each}
					</select>
					{#if !otherPlots.length}<p class="field-hint">No other plot quests in this world.</p>{/if}
				</div>
			{:else}
				<div class="field">
					<label class="label" for="efnote">Note</label>
					<input id="efnote" class="input" bind:value={effectNote} />
				</div>
			{/if}
			<div class="field">
				<label class="label" for="efl">Label</label>
				<input id="efl" class="input" bind:value={effectLabel} placeholder="Short label" />
			</div>
		</div>
		<div class="pqe__inline-add">
			<button type="button" class="btn btn-primary btn-sm" onclick={addEffect} disabled={busy || !addingEffectFor}>Add</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingEffectFor = ''}>Cancel</button>
		</div>
	</div>
{/snippet}

{#snippet descriptionField(n: any)}
	<div class="pqe__desc">
		{#if canEdit}
			<label class="label" for="desc-{n.id}">Description</label>
			<textarea
				id="desc-{n.id}"
				class="input"
				rows="3"
				value={n.description ?? ''}
				disabled={busy}
				onblur={(e) => {
					const v = e.currentTarget.value;
					if ((n.description ?? '') !== v) saveDescription(n.id, v);
				}}
			></textarea>
		{:else if n.description}
			<p class="pqe__desc-text">{n.description}</p>
		{:else}
			<p class="pqe__muted">No description.</p>
		{/if}
	</div>
{/snippet}

{#snippet childDraftForm(label: string, kind: string)}
	<div class="pqe__form-card">
		<div class="fields">
			<div class="field" style="grid-column:1 / -1;">
				<label class="label" for="draft-title-{kind}">Title</label>
				<input id="draft-title-{kind}" class="input" placeholder="{label} title" bind:value={draftTitle} />
			</div>
			<div class="field" style="grid-column:1 / -1;">
				<label class="label" for="draft-desc-{kind}">Description</label>
				<textarea id="draft-desc-{kind}" class="input" rows="3" placeholder="Optional" bind:value={draftDescription}></textarea>
			</div>
		</div>
		<div class="pqe__inline-add">
			<button type="button" class="btn btn-primary btn-sm" disabled={busy || !draftTitle.trim()} onclick={() => addChildDraft(kind)}>Add</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={cancelDraft}>Cancel</button>
		</div>
	</div>
{/snippet}

{#snippet connectionsFor(n: any)}
	<div class="pqe__connect">
		<div class="pqe__panel-label">When “{n.title}” completes</div>
		<p class="pqe__muted">Unlock or block another piece or plot. (Needs/prerequisites are below — not completion effects.)</p>
		{#each completionEdgesFrom(n.id) as e (e.id)}
			<div class="pqe__chip">
				<span class="badge">{COMPLETION_EDGE_OPTS.find(o => o.value === e.kind)?.label}</span>
				<strong>{edgeTargetLabel(e)}</strong>
				{#if canEdit}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEdge(e.id)} disabled={busy}>×</button>
				{/if}
			</div>
		{:else}
			<p class="pqe__muted">No unlock/block effects yet.</p>
		{/each}
		{#each neededByEdges(n.id) as e (e.id)}
			<div class="pqe__chip">
				<span class="badge badge-muted">Needed by</span>
				<strong>{edgeTargetLabel(e)}</strong>
				{#if canEdit}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEdge(e.id)} disabled={busy}>×</button>
				{/if}
			</div>
		{/each}
		{#if canEdit}
			{#if connectForId === n.id}
				<div class="pqe__form-card">
					<select class="input input--select" style="width:auto;" bind:value={edgeKind}>
						{#each COMPLETION_EDGE_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
					</select>
					<div class="pqe__inline-add">
						<button type="button" class="btn btn-sm" class:btn-primary={edgeTargetMode === 'node'} class:btn-ghost={edgeTargetMode !== 'node'} onclick={() => { edgeTargetMode = 'node'; edgeToPlot = ''; }}>In this plot</button>
						<button type="button" class="btn btn-sm" class:btn-primary={edgeTargetMode === 'plot'} class:btn-ghost={edgeTargetMode !== 'plot'} onclick={() => { edgeTargetMode = 'plot'; edgeTo = ''; }}>Another plot</button>
					</div>
					{#if edgeTargetMode === 'node'}
						<select class="input input--select" bind:value={edgeTo}>
							<option value="">Select piece…</option>
							{#each nodes.filter(x => x.id !== n.id) as t}
								<option value={t.id}>{kindLabel(t.kind)}: {t.title}</option>
							{/each}
						</select>
					{:else}
						<select class="input input--select" bind:value={edgeToPlot}>
							<option value="">Select plot quest…</option>
							{#each otherPlots as p}<option value={p.id}>{p.title}</option>{/each}
						</select>
					{/if}
					<div class="pqe__inline-add">
						<button
							type="button"
							class="btn btn-primary btn-sm"
							disabled={busy || (edgeTargetMode === 'node' ? !edgeTo : !edgeToPlot)}
							onclick={() => addConnectionFrom(n.id)}
						>Add</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => connectForId = ''}>Cancel</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => openConnect(n.id)} disabled={busy}>
					+ Unlock / block…
				</button>
			{/if}
		{/if}

		<div class="pqe__panel-label" style="margin-top:0.75rem;">“{n.title}” needs</div>
		<p class="pqe__muted">Prerequisites that must be done before this can proceed.</p>
		{#each needsEdges(n.id) as e (e.id)}
			<div class="pqe__chip">
				<span class="badge">Needs</span>
				<strong>{titleById.get(e.fromNodeId) ?? '…'}</strong>
				{#if canEdit}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEdge(e.id)} disabled={busy}>×</button>
				{/if}
			</div>
		{:else}
			<p class="pqe__muted">No prerequisites yet.</p>
		{/each}
		{#if canEdit}
			{#if needsForId === n.id}
				<div class="pqe__form-card">
					<select class="input input--select" bind:value={needsFromId}>
						<option value="">Select piece that must be done first…</option>
						{#each nodes.filter(x => x.id !== n.id) as t}
							<option value={t.id}>{kindLabel(t.kind)}: {t.title}</option>
						{/each}
					</select>
					<div class="pqe__inline-add">
						<button type="button" class="btn btn-primary btn-sm" disabled={busy || !needsFromId} onclick={() => addNeeds(n.id)}>Add</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => { needsForId = ''; needsFromId = ''; }}>Cancel</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => openNeeds(n.id)} disabled={busy}>
					+ Needs…
				</button>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet pieceBlock(n: any, showEffects = false)}
	<div class="pqe__nested-card">
		<div class="pqe__card-head">
			<span>{n.title}</span>
			<span class="badge badge-muted">{STATUS_LABELS[n.state?.status] ?? 'Locked'}</span>
			{#if showEffects}
				{#each n.effects ?? [] as ef}
					<span class="badge">{effectLabelOf(ef)}</span>
				{/each}
			{/if}
			{#if canEdit}
				<select class="input input--select" style="width:auto;" value={n.state?.status ?? 'LOCKED'} onchange={(e) => setStatus(n.id, e.currentTarget.value)} disabled={busy}>
					{#each STATUSES as s}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
				</select>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeNode(n.id)} disabled={busy}>×</button>
			{/if}
		</div>
		{#if n.kind === 'DISCOVERY' || n.kind === 'ENCOUNTER' || n.kind === 'EXIT'}
			{@render descriptionField(n)}
		{/if}
		{#if showEffects && canEdit}
			<div class="pqe__card-body">
				<div class="pqe__panel-label">Consequences</div>
				{#each n.effects ?? [] as ef (ef.id)}
					<div class="pqe__chip">
						{effectLabelOf(ef)}
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEffect(ef.id)} disabled={busy}>×</button>
					</div>
				{/each}
				{#if addingEffectFor === n.id}
					{@render effectForm()}
				{:else}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => openEffectForm(n.id)} disabled={busy}>+ Consequence…</button>
				{/if}
			</div>
		{/if}
		<div class="pqe__card-body">
			{@render connectionsFor(n)}
		</div>
	</div>
{/snippet}

<style>
	.pqe__tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
	.pqe__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.65rem; }

	.pqe__card {
		border: 1px solid var(--border-base);
		border-radius: 0.65rem;
		padding: 0.75rem;
		background: var(--bg-surface);
	}
	.pqe__card-head {
		display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
		margin-bottom: 0.35rem;
	}
	.pqe__card-body { margin-top: 0.5rem; }
	.pqe__nested-card {
		border: 1px solid var(--border-base);
		border-radius: 0.5rem;
		padding: 0.55rem 0.65rem;
		margin-bottom: 0.45rem;
		background: var(--bg-surface);
	}

	.pqe__panel-label {
		font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.35rem;
	}

	.pqe__chip {
		display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;
		padding: 0.35rem 0.5rem; margin-bottom: 0.25rem; border-radius: 0.4rem;
		background: var(--bg-muted); border: 1px solid var(--border-base); font-size: 0.85rem;
	}
	.pqe__muted { margin: 0.2rem 0 0.4rem; font-size: 0.8rem; color: var(--text-muted); }

	.pqe__inline-add { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.45rem; align-items: center; }
	.pqe__desc { margin: 0.35rem 0 0.55rem; max-width: 36rem; }
	.pqe__desc .label { margin-bottom: 0.25rem; }
	.pqe__desc-text {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		white-space: pre-wrap;
		color: var(--text-base);
	}

	.pqe__form-card {
		margin-top: 0.45rem;
		padding: 0.65rem;
		border-radius: 0.45rem;
		border: 1px solid var(--border-base);
		background: var(--bg-overlay);
		max-width: 32rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.pqe__connect { margin-top: 0.15rem; }
	.pqe__analysis { display: grid; gap: 0.85rem; }
	.pqe__analysis h4 { margin: 0 0 0.25rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
	.pqe__analysis p { margin: 0; font-size: 0.9rem; }
	.pqe__name-list {
		list-style: none; margin: 0; padding: 0;
		display: flex; flex-direction: column; gap: 0.2rem;
		font-size: 0.9rem;
	}
</style>