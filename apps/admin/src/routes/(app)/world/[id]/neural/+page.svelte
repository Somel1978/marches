<!-- apps/admin/src/routes/(app)/world/[id]/neural/+page.svelte -->
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
				return `/world/${w}/regions/${node.entityId}`;
			case 'LOCATION':
				return node.regionId
					? `/world/${w}/regions/${node.regionId}/locations/${node.entityId}`
					: null;
			case 'FACTION':
				return `/world/${w}/factions/${node.entityId}`;
			case 'NPC':
				return `/world/${w}/npcs/${node.entityId}`;
			case 'QUEST':
				return `/quests/${node.entityId}`;
			case 'CHARACTER':
				return `/characters/${node.entityId}`;
			case 'JOURNAL':
				return `/world/${w}/journal/${node.entityId}`;
			case 'PLOT_QUEST':
				return `/world/${w}/plot-quests/${node.entityId}`;
			default:
				return null;
		}
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{data.world.id}" class="back-link">← {data.world.name}</a>
			<h2 class="page__title">Neural map</h2>
		</div>
	</div>

	<p style="margin:0 0 0.75rem; color:var(--text-muted); font-size:0.875rem;">
		Lore board — place world elements and author connections. Plot scene flow is on each plot’s Progression tab.
		Double-click a node to open its page.
	</p>

	<WorldNeuralMap
		nodes={data.nodes}
		edges={data.edges}
		candidates={data.candidates}
		canEdit={data.canEdit}
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
</div>
