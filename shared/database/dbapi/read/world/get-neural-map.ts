// shared/database/dbapi/read/world/get-neural-map.ts
import { db } from '../../../index.ts';
import type { NeuralEntityType, NeuralMapLayer } from '@prisma/client';

export type NeuralCandidate = {
	entityType: NeuralEntityType;
	entityId: string;
	name: string;
	/** Extra context for picker (region name, etc.) */
	subtitle?: string | null;
	/** Needed for location hrefs */
	regionId?: string | null;
	/** Target board layer for this candidate */
	layer: NeuralMapLayer;
	/** For PLOT_NODE → open parent plot quest */
	plotQuestId?: string | null;
};

export type HydratedNeuralNode = {
	id: string;
	worldId: string;
	entityType: NeuralEntityType;
	entityId: string;
	layer: NeuralMapLayer;
	posX: number;
	posY: number;
	note: string | null;
	name: string;
	missing: boolean;
	regionId?: string | null;
	plotQuestId?: string | null;
	/** PLOT_NODE: PlotNode.kind (SCENE, DISCOVERY, …) */
	plotNodeKind?: string | null;
	/** PLOT_NODE: parent plot quest title */
	plotTitle?: string | null;
	/** Progression layer: persisted PlotNodeState */
	progressionStatus?: string | null;
	/** Derived from analysis */
	progressionAvailable?: boolean;
	progressionImpossible?: boolean;
	progressionEntryBlocked?: boolean;
};

export type HydratedNeuralEdge = {
	id: string;
	worldId: string;
	fromNodeId: string;
	toNodeId: string;
	label: string | null;
	notes: string | null;
	directed: boolean;
};

async function hydrateEntityNames(
	refs: { entityType: NeuralEntityType; entityId: string }[],
): Promise<Map<string, {
	name: string;
	regionId?: string | null;
	plotQuestId?: string | null;
	plotNodeKind?: string | null;
	plotTitle?: string | null;
}>> {
	const byType = new Map<NeuralEntityType, string[]>();
	for (const r of refs) {
		const list = byType.get(r.entityType) ?? [];
		list.push(r.entityId);
		byType.set(r.entityType, list);
	}

	const out = new Map<string, {
		name: string;
		regionId?: string | null;
		plotQuestId?: string | null;
		plotNodeKind?: string | null;
		plotTitle?: string | null;
	}>();
	const key = (t: NeuralEntityType, id: string) => `${t}:${id}`;

	const [
		regions, locations, factions, npcs, quests, characters, journals, plotQuests, plotNodes,
	] = await Promise.all([
		byType.has('REGION')
			? db.region.findMany({
				where: { id: { in: byType.get('REGION')! } },
				select: { id: true, name: true },
			})
			: [],
		byType.has('LOCATION')
			? db.location.findMany({
				where: { id: { in: byType.get('LOCATION')! } },
				select: { id: true, name: true, regionId: true },
			})
			: [],
		byType.has('FACTION')
			? db.faction.findMany({
				where: { id: { in: byType.get('FACTION')! } },
				select: { id: true, name: true },
			})
			: [],
		byType.has('NPC')
			? db.npc.findMany({
				where: { id: { in: byType.get('NPC')! } },
				select: { id: true, name: true },
			})
			: [],
		byType.has('QUEST')
			? db.quest.findMany({
				where: { id: { in: byType.get('QUEST')! } },
				select: { id: true, title: true },
			})
			: [],
		byType.has('CHARACTER')
			? db.character.findMany({
				where: { id: { in: byType.get('CHARACTER')! } },
				select: { id: true, name: true },
			})
			: [],
		byType.has('JOURNAL')
			? db.worldJournal.findMany({
				where: { id: { in: byType.get('JOURNAL')! } },
				select: { id: true, title: true },
			})
			: [],
		byType.has('PLOT_QUEST')
			? db.plotQuest.findMany({
				where: { id: { in: byType.get('PLOT_QUEST')! } },
				select: { id: true, title: true },
			})
			: [],
		byType.has('PLOT_NODE')
			? db.plotNode.findMany({
				where: { id: { in: byType.get('PLOT_NODE')! } },
				select: {
					id: true,
					title: true,
					kind: true,
					plotQuestId: true,
					plotQuest: { select: { title: true } },
				},
			})
			: [],
	]);

	for (const r of regions) out.set(key('REGION', r.id), { name: r.name });
	for (const l of locations) out.set(key('LOCATION', l.id), { name: l.name, regionId: l.regionId });
	for (const f of factions) out.set(key('FACTION', f.id), { name: f.name });
	for (const n of npcs) out.set(key('NPC', n.id), { name: n.name });
	for (const q of quests) out.set(key('QUEST', q.id), { name: q.title });
	for (const c of characters) out.set(key('CHARACTER', c.id), { name: c.name });
	for (const j of journals) out.set(key('JOURNAL', j.id), { name: j.title });
	for (const p of plotQuests) out.set(key('PLOT_QUEST', p.id), { name: p.title });
	for (const pn of plotNodes) {
		out.set(key('PLOT_NODE', pn.id), {
			name: pn.title,
			plotQuestId: pn.plotQuestId,
			plotNodeKind: pn.kind,
			plotTitle: pn.plotQuest?.title ?? null,
		});
	}

	return out;
}

export async function getNeuralMap(worldId: string): Promise<{
	nodes: HydratedNeuralNode[];
	edges: HydratedNeuralEdge[];
	/** Deprecated — Progression overlays removed; always empty. Kept for API compat. */
	overlayEdges: HydratedNeuralEdge[];
}> {
	// Lore-only board. Plot flowchart positions still sync via getPlotProgression / createPlotNode.
	const [nodes, edges] = await Promise.all([
		db.neuralMapNode.findMany({
			where: { worldId, layer: 'LORE', entityType: { not: 'PLOT_NODE' } },
		}),
		db.neuralMapEdge.findMany({ where: { worldId } }),
	]);

	const names = await hydrateEntityNames(
		nodes.map(n => ({ entityType: n.entityType, entityId: n.entityId })),
	);

	const hydrated: HydratedNeuralNode[] = nodes.map(n => {
		const h = names.get(`${n.entityType}:${n.entityId}`);
		return {
			id: n.id,
			worldId: n.worldId,
			entityType: n.entityType,
			entityId: n.entityId,
			layer: n.layer,
			posX: n.posX,
			posY: n.posY,
			note: n.note,
			name: h?.name ?? '(missing)',
			missing: !h,
			regionId: h?.regionId ?? null,
			plotQuestId: h?.plotQuestId ?? null,
			plotNodeKind: h?.plotNodeKind ?? null,
			plotTitle: h?.plotTitle ?? null,
		};
	});

	const loreIds = new Set(hydrated.map(n => n.id));
	return {
		nodes: hydrated,
		edges: edges
			.filter(e => loreIds.has(e.fromNodeId) && loreIds.has(e.toNodeId))
			.map(e => ({
				id: e.id,
				worldId: e.worldId,
				fromNodeId: e.fromNodeId,
				toNodeId: e.toNodeId,
				label: e.label,
				notes: e.notes,
				directed: e.directed,
			})),
		overlayEdges: [],
	};
}

/** Catalog of placeable entities for the neural map picker (excludes already-placed). */
export async function listNeuralCandidates(worldId: string): Promise<NeuralCandidate[]> {
	const placed = await db.neuralMapNode.findMany({
		where: { worldId },
		select: { entityType: true, entityId: true },
	});
	const placedKeys = new Set(placed.map(p => `${p.entityType}:${p.entityId}`));

	const regions = await db.region.findMany({
		where: { worldId },
		select: { id: true, name: true, locations: { select: { id: true, name: true, regionId: true } } },
		orderBy: { name: 'asc' },
	});
	const regionIds = regions.map(r => r.id);

	const [factions, npcs, quests, characters, journals, plotQuests] = await Promise.all([
		db.faction.findMany({
			where: { worldId },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
		}),
		db.npc.findMany({
			where: { worldId },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
		}),
		regionIds.length
			? db.quest.findMany({
				where: { regionId: { in: regionIds } },
				select: { id: true, title: true },
				orderBy: { title: 'asc' },
				take: 500,
			})
			: Promise.resolve([]),
		db.character.findMany({
			where: { worldId },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
			take: 500,
		}),
		db.worldJournal.findMany({
			where: { worldId },
			select: { id: true, title: true },
			orderBy: { sortOrder: 'asc' },
		}),
		db.plotQuest.findMany({
			where: { worldId },
			select: { id: true, title: true, status: true },
			orderBy: { title: 'asc' },
		}),
	]);

	const out: NeuralCandidate[] = [];

	for (const r of regions) {
		if (!placedKeys.has(`REGION:${r.id}`)) {
			out.push({ entityType: 'REGION', entityId: r.id, name: r.name, layer: 'LORE' });
		}
		for (const l of r.locations) {
			if (!placedKeys.has(`LOCATION:${l.id}`)) {
				out.push({
					entityType: 'LOCATION',
					entityId: l.id,
					name: l.name,
					subtitle: r.name,
					regionId: l.regionId,
					layer: 'LORE',
				});
			}
		}
	}
	for (const f of factions) {
		if (!placedKeys.has(`FACTION:${f.id}`)) {
			out.push({ entityType: 'FACTION', entityId: f.id, name: f.name, layer: 'LORE' });
		}
	}
	for (const n of npcs) {
		if (!placedKeys.has(`NPC:${n.id}`)) {
			out.push({ entityType: 'NPC', entityId: n.id, name: n.name, layer: 'LORE' });
		}
	}
	for (const q of quests) {
		if (!placedKeys.has(`QUEST:${q.id}`)) {
			out.push({ entityType: 'QUEST', entityId: q.id, name: q.title, layer: 'LORE' });
		}
	}
	for (const c of characters) {
		if (!placedKeys.has(`CHARACTER:${c.id}`)) {
			out.push({ entityType: 'CHARACTER', entityId: c.id, name: c.name, layer: 'LORE' });
		}
	}
	for (const j of journals) {
		if (!placedKeys.has(`JOURNAL:${j.id}`)) {
			out.push({ entityType: 'JOURNAL', entityId: j.id, name: j.title, layer: 'LORE' });
		}
	}
	for (const p of plotQuests) {
		if (!placedKeys.has(`PLOT_QUEST:${p.id}`)) {
			out.push({
				entityType: 'PLOT_QUEST',
				entityId: p.id,
				name: p.title,
				subtitle: p.status,
				layer: 'LORE',
			});
		}
	}

	return out;
}
