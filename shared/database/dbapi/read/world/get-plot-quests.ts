// shared/database/dbapi/read/world/get-plot-quests.ts
import { db } from '../../../index.ts';
import type { PlotQuestStatus } from '@prisma/client';

export type PlotQuestListItem = {
	id: string;
	worldId: string;
	title: string;
	summary: string | null;
	status: PlotQuestStatus;
	deadlineDay: number | null;
	sortOrder: number;
	createdAt: Date;
	updatedAt: Date;
	linkedQuestCount: number;
	linkedFactionCount: number;
	linkedNpcCount: number;
};

async function worldRegionIds(worldId: string): Promise<string[]> {
	const regions = await db.region.findMany({ where: { worldId }, select: { id: true } });
	return regions.map(r => r.id);
}

export async function listPlotQuestsByWorld(worldId: string): Promise<PlotQuestListItem[]> {
	const plots = await db.plotQuest.findMany({
		where: { worldId },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		include: {
			linkedQuests: { select: { id: true } },
		},
	});

	const plotIds = plots.map(p => p.id);
	const [factionLinks, npcLinks] = await Promise.all([
		plotIds.length
			? db.factionQuest.findMany({ where: { plotQuestId: { in: plotIds } }, select: { plotQuestId: true } })
			: [],
		plotIds.length
			? db.npcQuest.findMany({ where: { plotQuestId: { in: plotIds } }, select: { plotQuestId: true } })
			: [],
	]);

	const factionCount = new Map<string, number>();
	const npcCount = new Map<string, number>();
	for (const l of factionLinks) factionCount.set(l.plotQuestId, (factionCount.get(l.plotQuestId) ?? 0) + 1);
	for (const l of npcLinks) npcCount.set(l.plotQuestId, (npcCount.get(l.plotQuestId) ?? 0) + 1);

	return plots.map(p => ({
		id: p.id,
		worldId: p.worldId,
		title: p.title,
		summary: p.summary,
		status: p.status,
		deadlineDay: p.deadlineDay,
		sortOrder: p.sortOrder,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		linkedQuestCount: p.linkedQuests.length,
		linkedFactionCount: factionCount.get(p.id) ?? 0,
		linkedNpcCount: npcCount.get(p.id) ?? 0,
	}));
}

export async function getPlotQuestById(id: string) {
	const plot = await db.plotQuest.findUnique({
		where: { id },
		include: { linkedQuests: true },
	});
	if (!plot) return null;

	const questIds = plot.linkedQuests.map(l => l.questId);
	const [quests, factionLinks, npcLinks] = await Promise.all([
		questIds.length
			? db.quest.findMany({
				where: { id: { in: questIds } },
				select: { id: true, title: true, status: true, scheduledAt: true },
			})
			: [],
		db.factionQuest.findMany({ where: { plotQuestId: id } }),
		db.npcQuest.findMany({ where: { plotQuestId: id } }),
	]);

	const questMap = Object.fromEntries(quests.map(q => [q.id, q]));
	const factionIds = factionLinks.map(l => l.factionId);
	const npcIds = npcLinks.map(l => l.npcId);

	const [factions, npcs] = await Promise.all([
		factionIds.length
			? db.faction.findMany({ where: { id: { in: factionIds } }, select: { id: true, name: true, slug: true } })
			: [],
		npcIds.length
			? db.npc.findMany({ where: { id: { in: npcIds } }, select: { id: true, name: true } })
			: [],
	]);
	const factionMap = Object.fromEntries(factions.map(f => [f.id, f]));
	const npcMap = Object.fromEntries(npcs.map(n => [n.id, n]));

	return {
		...plot,
		linkedQuests: plot.linkedQuests.map(l => ({
			...l,
			quest: questMap[l.questId] ?? null,
		})),
		factions: factionLinks.map(l => ({
			...l,
			faction: factionMap[l.factionId] ?? null,
		})),
		npcs: npcLinks.map(l => ({
			...l,
			npc: npcMap[l.npcId] ?? null,
		})),
	};
}

/** System quests available to link for a world (region-scoped). */
export async function listLinkableSystemQuests(worldId: string) {
	const regionIds = await worldRegionIds(worldId);
	if (!regionIds.length) return [];
	return db.quest.findMany({
		where: { regionId: { in: regionIds } },
		select: { id: true, title: true, status: true, scheduledAt: true },
		orderBy: { title: 'asc' },
		take: 500,
	});
}
