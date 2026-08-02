<!-- shared/ui/src/world/WorldNeuralMap.svelte -->
<!-- DM lore board: place entities, author connections, open detail pages. -->
<script lang="ts">
	import type {
		NeuralCandidateView,
		NeuralEntityType,
		NeuralMapEdgeView,
		NeuralMapNodeView,
	} from './neural-map-types.ts';

	const TYPE_META: Record<NeuralEntityType, { label: string; icon: string }> = {
		REGION:    { label: 'Region',    icon: '🗺' },
		LOCATION:  { label: 'Location',  icon: '📍' },
		FACTION:   { label: 'Faction',   icon: '🛡' },
		NPC:       { label: 'NPC',       icon: '👤' },
		QUEST:     { label: 'Quest',     icon: '⚔' },
		CHARACTER: { label: 'Character', icon: '🎭' },
		JOURNAL:   { label: 'Journal',   icon: '📖' },
	};

	const TYPE_ORDER: NeuralEntityType[] = [
		'REGION', 'LOCATION', 'FACTION', 'NPC', 'QUEST', 'CHARACTER', 'JOURNAL',
	];

	let {
		nodes = [],
		edges = [],
		candidates = [],
		canEdit = true,
		hrefFor,
		onAddNode,
		onUpdateNode,
		onRemoveNode,
		onAddEdge,
		onUpdateEdge,
		onRemoveEdge,
	}: {
		nodes?: NeuralMapNodeView[];
		edges?: NeuralMapEdgeView[];
		candidates?: NeuralCandidateView[];
		canEdit?: boolean;
		hrefFor: (node: NeuralMapNodeView) => string | null;
		onAddNode?: (c: NeuralCandidateView, pos: { posX: number; posY: number }) => Promise<void> | void;
		onUpdateNode?: (id: string, patch: { posX?: number; posY?: number; note?: string | null }) => Promise<void> | void;
		onRemoveNode?: (id: string) => Promise<void> | void;
		onAddEdge?: (input: { fromNodeId: string; toNodeId: string; label?: string }) => Promise<void> | void;
		onUpdateEdge?: (id: string, patch: { label?: string | null; notes?: string | null }) => Promise<void> | void;
		onRemoveEdge?: (id: string) => Promise<void> | void;
	} = $props();

	let localNodes = $state<NeuralMapNodeView[]>([]);
	$effect(() => {
		localNodes = nodes.map(n => ({ ...n }));
	});

	let mode = $state<'select' | 'connect'>('select');
	let connectFrom = $state<string | null>(null);
	let search = $state('');
	let typeFilter = $state<NeuralEntityType | 'ALL'>('ALL');
	let panX = $state(0);
	let panY = $state(0);
	let zoom = $state(1);
	let draggingNode = $state<string | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let panning = $state(false);
	let panStart = $state({ x: 0, y: 0, panX: 0, panY: 0 });
	let selectedEdgeId = $state<string | null>(null);
	let edgeLabelDraft = $state('');
	let edgeNotesDraft = $state('');
	let busy = $state(false);
	let boardEl = $state<HTMLDivElement | null>(null);

	const nodeById = $derived(Object.fromEntries(localNodes.map(n => [n.id, n])));

	const filteredCandidates = $derived(
		candidates.filter(c => {
			if (typeFilter !== 'ALL' && c.entityType !== typeFilter) return false;
			if (!search.trim()) return true;
			const q = search.trim().toLowerCase();
			return c.name.toLowerCase().includes(q)
				|| (c.subtitle?.toLowerCase().includes(q) ?? false)
				|| c.entityType.toLowerCase().includes(q);
		}),
	);

	const selectedEdge = $derived(edges.find(e => e.id === selectedEdgeId) ?? null);

	$effect(() => {
		if (selectedEdge) {
			edgeLabelDraft = selectedEdge.label ?? '';
			edgeNotesDraft = selectedEdge.notes ?? '';
		}
	});

	function screenToWorld(clientX: number, clientY: number) {
		const rect = boardEl?.getBoundingClientRect();
		if (!rect) return { x: 500, y: 500 };
		return {
			x: (clientX - rect.left - panX) / zoom,
			y: (clientY - rect.top - panY) / zoom,
		};
	}

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

	function onBoardPointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement).closest('.neural-node, .neural-edge-hit, .neural-edge-label')) return;
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
		if (draggingNode && canEdit) {
			const w = screenToWorld(e.clientX, e.clientY);
			const posX = w.x - dragOffset.x;
			const posY = w.y - dragOffset.y;
			localNodes = localNodes.map(x =>
				x.id === draggingNode ? { ...x, posX, posY } : x,
			);
		}
	}

	async function onBoardPointerUp() {
		if (panning) {
			panning = false;
			return;
		}
		if (draggingNode && canEdit) {
			const id = draggingNode;
			const n = localNodes.find(x => x.id === id);
			draggingNode = null;
			if (n) {
				busy = true;
				try { await onUpdateNode?.(id, { posX: n.posX, posY: n.posY }); }
				finally { busy = false; }
			}
		}
	}

	function onNodePointerDown(e: PointerEvent, node: NeuralMapNodeView) {
		e.stopPropagation();
		if (!canEdit || mode === 'connect') return;
		draggingNode = node.id;
		const w = screenToWorld(e.clientX, e.clientY);
		dragOffset = { x: w.x - node.posX, y: w.y - node.posY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	async function connectNode(node: NeuralMapNodeView) {
		if (!canEdit || mode !== 'connect') return;
		if (!connectFrom) {
			connectFrom = node.id;
			return;
		}
		if (connectFrom === node.id) {
			connectFrom = null;
			return;
		}
		const fromNodeId = connectFrom;
		connectFrom = null;
		busy = true;
		try { await onAddEdge?.({ fromNodeId, toNodeId: node.id, label: '' }); }
		finally { busy = false; }
	}

	function onNodeClick(e: MouseEvent, node: NeuralMapNodeView) {
		e.stopPropagation();
		// Single click: connect mode only. Open page on double-click.
		if (mode === 'connect') void connectNode(node);
	}

	function openNodePage(node: NeuralMapNodeView) {
		const href = hrefFor(node);
		if (href) window.location.href = href;
	}

	function onNodeDblClick(e: MouseEvent, node: NeuralMapNodeView) {
		e.stopPropagation();
		e.preventDefault();
		if (mode === 'connect') return;
		openNodePage(node);
	}

	function onNodeKeydown(e: KeyboardEvent, node: NeuralMapNodeView) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (mode === 'connect') void connectNode(node);
			else openNodePage(node);
		}
	}

	async function addCandidate(c: NeuralCandidateView) {
		if (!canEdit || busy) return;
		const rect = boardEl?.getBoundingClientRect();
		const center = screenToWorld(
			(rect?.left ?? 0) + (rect?.width ?? 800) / 2,
			(rect?.top ?? 0) + (rect?.height ?? 600) / 2,
		);
		busy = true;
		try {
			await onAddNode?.(c, {
				posX: center.x + (Math.random() * 60 - 30),
				posY: center.y + (Math.random() * 60 - 30),
			});
		} finally {
			busy = false;
		}
	}

	async function removeNode(id: string) {
		if (!canEdit || busy) return;
		busy = true;
		try { await onRemoveNode?.(id); }
		finally { busy = false; }
	}

	function selectEdge(edgeId: string, e?: Event) {
		e?.stopPropagation();
		selectedEdgeId = edgeId;
	}

	function onEdgeKeydown(e: KeyboardEvent, edgeId: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectEdge(edgeId);
		}
	}

	async function saveEdge() {
		if (!selectedEdgeId || !canEdit) return;
		busy = true;
		try {
			await onUpdateEdge?.(selectedEdgeId, {
				label: edgeLabelDraft,
				notes: edgeNotesDraft,
			});
		} finally {
			busy = false;
		}
	}

	async function deleteEdge() {
		if (!selectedEdgeId || !canEdit) return;
		busy = true;
		try {
			await onRemoveEdge?.(selectedEdgeId);
			selectedEdgeId = null;
		} finally {
			busy = false;
		}
	}

	function edgePath(from: NeuralMapNodeView, to: NeuralMapNodeView) {
		const x1 = from.posX;
		const y1 = from.posY;
		const x2 = to.posX;
		const y2 = to.posY;
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const cx = mx - dy * 0.15;
		const cy = my + dx * 0.15;
		return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, midX: cx, midY: cy };
	}

	function fitView() {
		if (!localNodes.length || !boardEl) {
			panX = 0; panY = 0; zoom = 1;
			return;
		}
		const xs = localNodes.map(n => n.posX);
		const ys = localNodes.map(n => n.posY);
		const minX = Math.min(...xs) - 80;
		const maxX = Math.max(...xs) + 80;
		const minY = Math.min(...ys) - 60;
		const maxY = Math.max(...ys) + 60;
		const w = boardEl.clientWidth;
		const h = boardEl.clientHeight;
		const zx = w / Math.max(200, maxX - minX);
		const zy = h / Math.max(160, maxY - minY);
		zoom = Math.min(1.4, Math.max(0.4, Math.min(zx, zy)));
		panX = w / 2 - ((minX + maxX) / 2) * zoom;
		panY = h / 2 - ((minY + maxY) / 2) * zoom;
	}
</script>

<div class="neural" class:neural--busy={busy}>
	<aside class="neural__sidebar">
		<div class="neural__sidebar-head">
			<h3 class="neural__title">Add to board</h3>
			<p class="neural__hint">Place elements, then connect them for plot/lore.</p>
		</div>
		<input
			class="input neural__search"
			type="search"
			placeholder="Search…"
			bind:value={search}
		/>
		<div class="neural__filters">
			<button type="button" class="neural__chip" class:neural__chip--on={typeFilter === 'ALL'} onclick={() => typeFilter = 'ALL'}>All</button>
			{#each TYPE_ORDER as t}
				<button type="button" class="neural__chip" class:neural__chip--on={typeFilter === t} onclick={() => typeFilter = t} title={TYPE_META[t].label}>
					{TYPE_META[t].icon}
				</button>
			{/each}
		</div>
		<ul class="neural__list">
			{#if !canEdit}
				<li class="neural__empty">View only</li>
			{:else if filteredCandidates.length === 0}
				<li class="neural__empty">No matching elements to add.</li>
			{:else}
				{#each filteredCandidates as c (c.entityType + c.entityId)}
					<li>
						<button type="button" class="neural__cand" onclick={() => addCandidate(c)} disabled={busy}>
							<span class="neural__cand-icon">{TYPE_META[c.entityType].icon}</span>
							<span class="neural__cand-text">
								<span class="neural__cand-name">{c.name}</span>
								<span class="neural__cand-sub">{TYPE_META[c.entityType].label}{c.subtitle ? ` · ${c.subtitle}` : ''}</span>
							</span>
							<span class="neural__cand-add">+</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	</aside>

	<div class="neural__main">
		<div class="neural__toolbar">
			<div class="neural__modes">
				<button type="button" class="btn btn-sm" class:btn-primary={mode === 'select'} class:btn-ghost={mode !== 'select'} onclick={() => { mode = 'select'; connectFrom = null; }}>
					Select
				</button>
				{#if canEdit}
					<button type="button" class="btn btn-sm" class:btn-primary={mode === 'connect'} class:btn-ghost={mode !== 'connect'} onclick={() => { mode = 'connect'; connectFrom = null; }}>
						Connect
					</button>
				{/if}
			</div>
			<div class="neural__tools">
				{#if mode === 'connect'}
					<span class="neural__status">
						{#if connectFrom}
							Click a second node to link…
						{:else}
							Click the first node…
						{/if}
					</span>
				{/if}
				<button type="button" class="btn btn-ghost btn-sm" onclick={fitView}>Fit</button>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => { zoom = Math.min(2.5, zoom * 1.15); }}>+</button>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => { zoom = Math.max(0.35, zoom / 1.15); }}>−</button>
			</div>
		</div>

		<div
			class="neural__board"
			role="application"
			aria-label="Neural map canvas. Drag to pan, scroll to zoom."
			bind:this={boardEl}
			onwheel={onWheel}
			onpointerdown={onBoardPointerDown}
			onpointermove={onBoardPointerMove}
			onpointerup={onBoardPointerUp}
			onpointercancel={onBoardPointerUp}
		>
			{#if localNodes.length === 0}
				<div class="neural__empty-board">
					<p>No elements on the board yet.</p>
					<p>Add regions, NPCs, quests, journals… from the sidebar, then use <strong>Connect</strong> to draw plot links.</p>
				</div>
			{/if}

			<div class="neural__world" style="transform: translate({panX}px, {panY}px) scale({zoom});">
				<svg class="neural__edges" viewBox="0 0 1000 1000" width="1000" height="1000">
					<defs>
						<marker id="neural-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
							<path d="M0,0 L6,3 L0,6 Z" fill="var(--text-muted)" />
						</marker>
					</defs>
					{#each edges as edge (edge.id)}
						{@const from = nodeById[edge.fromNodeId]}
						{@const to = nodeById[edge.toNodeId]}
						{#if from && to}
							{@const path = edgePath(from, to)}
							<path
								class="neural-edge"
								class:neural-edge--on={selectedEdgeId === edge.id}
								d={path.d}
								fill="none"
								marker-end={edge.directed ? 'url(#neural-arrow)' : undefined}
								pointer-events="stroke"
							/>
							<!-- Wide hit target: interactive for a11y -->
							<path
								class="neural-edge-hit"
								d={path.d}
								fill="none"
								stroke="transparent"
								stroke-width="14"
								role="button"
								tabindex="0"
								aria-label={edge.label ? `Connection: ${edge.label}` : 'Connection'}
								onclick={(ev) => selectEdge(edge.id, ev)}
								onkeydown={(ev) => onEdgeKeydown(ev, edge.id)}
							/>
							{#if edge.label}
								<text
									class="neural-edge-label"
									x={path.midX}
									y={path.midY}
									pointer-events="none"
								>{edge.label}</text>
							{/if}
						{/if}
					{/each}
				</svg>

				{#each localNodes as node (node.id)}
					<div
						class="neural-node-wrap"
						style="left:{node.posX}px; top:{node.posY}px;"
					>
						<button
							type="button"
							class="neural-node neural-node--{node.entityType.toLowerCase()}"
							class:neural-node--connect={connectFrom === node.id}
							class:neural-node--missing={node.missing}
							title="{node.note || node.name} — double-click to open"
							aria-label="{TYPE_META[node.entityType].label}: {node.name}. Double-click to open."
							onpointerdown={(ev) => onNodePointerDown(ev, node)}
							onclick={(ev) => onNodeClick(ev, node)}
							ondblclick={(ev) => onNodeDblClick(ev, node)}
							onkeydown={(ev) => onNodeKeydown(ev, node)}
						>
							<span class="neural-node__icon" aria-hidden="true">{TYPE_META[node.entityType].icon}</span>
							<span class="neural-node__name">{node.name}</span>
							<span class="neural-node__type">{TYPE_META[node.entityType].label}</span>
						</button>
						{#if canEdit && mode === 'select'}
							<button
								type="button"
								class="neural-node__rm"
								title="Remove from board"
								aria-label="Remove {node.name} from board"
								onclick={() => removeNode(node.id)}
							>×</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		{#if selectedEdge}
			<div class="neural__edge-panel">
				<h4>Connection</h4>
				{#if canEdit}
					<label class="label" for="edge-label">Label</label>
					<input id="edge-label" class="input" bind:value={edgeLabelDraft} placeholder="e.g. suspects, allied with" />
					<label class="label" for="edge-notes">Notes</label>
					<textarea id="edge-notes" class="input" rows="3" bind:value={edgeNotesDraft} placeholder="Plot notes…"></textarea>
					<div class="neural__edge-actions">
						<button type="button" class="btn btn-primary btn-sm" onclick={saveEdge} disabled={busy}>Save</button>
						<button type="button" class="btn btn-danger btn-sm" onclick={deleteEdge} disabled={busy}>Delete</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => selectedEdgeId = null}>Close</button>
					</div>
				{:else}
					<p><strong>{selectedEdge.label || '(no label)'}</strong></p>
					{#if selectedEdge.notes}<p class="neural__hint">{selectedEdge.notes}</p>{/if}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => selectedEdgeId = null}>Close</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.neural {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 0;
		min-height: 70vh;
		border: 1px solid var(--border-base);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--bg-surface);
	}

	.neural--busy { opacity: 0.85; pointer-events: none; }

	.neural__sidebar {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--border-base);
		background: var(--bg-muted);
		min-height: 0;
	}

	.neural__sidebar-head { padding: 0.85rem 0.85rem 0.4rem; }
	.neural__title { margin: 0; font-size: 0.95rem; }
	.neural__hint { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--text-muted); }

	.neural__search { margin: 0.5rem 0.75rem; width: calc(100% - 1.5rem); }

	.neural__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0 0.75rem 0.5rem;
	}

	.neural__chip {
		border: 1px solid var(--border-base);
		background: var(--bg-surface);
		color: var(--text-secondary);
		border-radius: 99px;
		padding: 0.15rem 0.45rem;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.neural__chip--on {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: var(--text-primary);
	}

	.neural__list {
		list-style: none;
		margin: 0;
		padding: 0 0.5rem 0.75rem;
		overflow: auto;
		flex: 1;
	}

	.neural__empty {
		padding: 0.75rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.neural__cand {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		width: 100%;
		text-align: left;
		padding: 0.4rem 0.45rem;
		border: none;
		border-radius: 0.4rem;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
	}
	.neural__cand:hover { background: var(--bg-surface); }
	.neural__cand-icon { font-size: 1rem; }
	.neural__cand-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.neural__cand-name { font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.neural__cand-sub { font-size: 0.6875rem; color: var(--text-muted); }
	.neural__cand-add { color: var(--accent); font-weight: 700; }

	.neural__main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		position: relative;
		background:
			radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%),
			radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 50%),
			var(--bg-base, var(--bg-surface));
	}

	.neural__toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border-base);
		background: color-mix(in srgb, var(--bg-surface) 85%, transparent);
		flex-wrap: wrap;
	}

	.neural__modes, .neural__tools { display: flex; align-items: center; gap: 0.35rem; }
	.neural__status { font-size: 0.75rem; color: var(--accent); }

	.neural__board {
		flex: 1;
		position: relative;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		min-height: 480px;
	}
	.neural__board:active { cursor: grabbing; }

	.neural__empty-board {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		text-align: center;
		color: var(--text-muted);
		padding: 2rem;
		pointer-events: none;
		z-index: 1;
	}

	.neural__world {
		position: absolute;
		left: 0;
		top: 0;
		width: 1000px;
		height: 1000px;
		transform-origin: 0 0;
	}

	.neural__edges {
		position: absolute;
		inset: 0;
		overflow: visible;
		pointer-events: none;
	}
	.neural__edges :global(.neural-edge-hit) {
		pointer-events: stroke;
		cursor: pointer;
		outline: none;
	}
	.neural__edges :global(.neural-edge-hit:focus-visible) {
		stroke: var(--accent);
		stroke-opacity: 0.35;
	}

	.neural__edges :global(.neural-edge) {
		stroke: color-mix(in srgb, var(--accent) 55%, var(--text-muted));
		stroke-width: 2;
		opacity: 0.85;
		pointer-events: none;
	}
	.neural__edges :global(.neural-edge--on) {
		stroke: var(--accent);
		stroke-width: 2.5;
		opacity: 1;
	}
	.neural__edges :global(.neural-edge-label) {
		fill: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
		text-anchor: middle;
		paint-order: stroke;
		stroke: var(--bg-base, var(--bg-surface));
		stroke-width: 3px;
		pointer-events: none;
	}

	.neural-node-wrap {
		position: absolute;
		transform: translate(-50%, -50%);
		z-index: 2;
	}

	.neural-node {
		min-width: 110px;
		max-width: 160px;
		padding: 0.45rem 0.55rem;
		border-radius: 0.65rem;
		border: 1px solid var(--border-base);
		background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent), 0 4px 18px rgba(0,0,0,0.25);
		cursor: pointer;
		user-select: none;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		color: inherit;
		font: inherit;
		text-align: left;
	}
	.neural-node:hover { border-color: var(--accent); }
	.neural-node:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.neural-node--connect {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent), 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
	}
	.neural-node--missing { opacity: 0.55; border-style: dashed; }

	.neural-node__icon { font-size: 1rem; line-height: 1; }
	.neural-node__name { font-size: 0.8125rem; font-weight: 700; line-height: 1.2; word-break: break-word; }
	.neural-node__type { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
	.neural-node__rm {
		position: absolute;
		top: -0.35rem;
		right: -0.35rem;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 99px;
		border: 1px solid var(--border-base);
		background: var(--bg-muted);
		color: var(--text-muted);
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
		display: none;
		place-items: center;
		padding: 0;
		z-index: 3;
	}
	.neural-node-wrap:hover .neural-node__rm,
	.neural-node-wrap:focus-within .neural-node__rm { display: grid; }

	.neural-node--region { border-top: 3px solid #5c6bc0; }
	.neural-node--location { border-top: 3px solid #26a69a; }
	.neural-node--faction { border-top: 3px solid #ef6c00; }
	.neural-node--npc { border-top: 3px solid #8d6e63; }
	.neural-node--quest { border-top: 3px solid #c62828; }
	.neural-node--character { border-top: 3px solid #7b1fa2; }
	.neural-node--journal { border-top: 3px solid #1565c0; }

	.neural__edge-panel {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		width: min(280px, calc(100% - 1.5rem));
		padding: 0.75rem;
		border-radius: 0.65rem;
		border: 1px solid var(--border-base);
		background: var(--bg-surface);
		box-shadow: 0 8px 28px rgba(0,0,0,0.35);
		z-index: 5;
	}
	.neural__edge-panel h4 { margin: 0 0 0.5rem; font-size: 0.9rem; }
	.neural__edge-panel .label { margin-top: 0.4rem; }
	.neural__edge-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.6rem; }

	@media (max-width: 800px) {
		.neural { grid-template-columns: 1fr; }
		.neural__sidebar { max-height: 220px; border-right: none; border-bottom: 1px solid var(--border-base); }
	}
</style>
