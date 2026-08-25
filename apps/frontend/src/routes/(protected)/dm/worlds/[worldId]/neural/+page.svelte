<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/neural/+page.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { WorldNeuralMap, type NeuralMapNodeView, type NeuralCandidateView } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function call(action: string, fields: Record<string, string | number | null | undefined>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) {
			if (v === undefined) continue;
			fd.set(k, v == null ? '' : String(v));
		}
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		if (!res.ok) {
			const body = await res.text();
			console.error('Neural map action failed', action, body);
			throw new Error(`Neural map ${action} failed (${res.status})`);
		}
		await invalidateAll();
	}

	function hrefFor(node: NeuralMapNodeView): string | null {
		const w = data.world.id;
		switch (node.entityType) {
			case 'REGION':
				return `/dm/worlds/${w}/regions/${node.entityId}`;
			case 'LOCATION':
				return node.regionId
					? `/dm/worlds/${w}/regions/${node.regionId}/locations/${node.entityId}`
					: null;
			case 'FACTION':
				return `/dm/worlds/${w}/factions/${node.entityId}`;
			case 'NPC':
				return `/dm/worlds/${w}/npcs/${node.entityId}`;
			case 'QUEST':
				return `/dm/quests/${node.entityId}`;
			case 'CHARACTER':
				return `/dm/worlds/${w}/characters/${node.entityId}`;
			case 'JOURNAL':
				return `/dm/worlds/${w}/journal/${node.entityId}`;
			case 'PLOT_QUEST':
				return `/dm/worlds/${w}/plot-quests/${node.entityId}`;
			default:
				return null;
		}
	}
</script>

<div style="margin-bottom:0.75rem;">
	<p style="margin:0; color:var(--text-muted); font-size:0.875rem;">
		Neural lore board for {data.world.name} — place factions, NPCs, plot quest cards, and author connections.
		Plot scene flow is edited on each plot’s <strong>Progression</strong> tab. Double-click a node to open its page.
	</p>
</div>

<WorldNeuralMap
	nodes={data.nodes}
	edges={data.edges}
	candidates={data.candidates}
	canEdit={true}
	{hrefFor}
	onAddNode={(c: NeuralCandidateView, pos) => call('addNode', {
		entityType: c.entityType,
		entityId: c.entityId,
		posX: pos.posX,
		posY: pos.posY,
		layer: 'LORE',
	})}
	onUpdateNode={(id, patch) => call('updateNode', {
		nodeId: id,
		posX: patch.posX,
		posY: patch.posY,
		note: patch.note,
	})}
	onRemoveNode={(id) => call('removeNode', { nodeId: id })}
	onAddEdge={(input) => call('addEdge', {
		fromNodeId: input.fromNodeId,
		toNodeId: input.toNodeId,
		label: input.label ?? '',
	})}
	onUpdateEdge={(id, patch) => call('updateEdge', {
		edgeId: id,
		label: patch.label,
		notes: patch.notes,
	})}
	onRemoveEdge={(id) => call('removeEdge', { edgeId: id })}
/>
