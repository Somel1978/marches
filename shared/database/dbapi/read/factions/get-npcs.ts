// shared/database/dbapi/read/factions/get-npcs.ts
import { db } from '../../../index.ts';

export type GetNpcsOptions = {
    factionId?:   string;
    q?:           string;  // search name + aliases
    visibleOnly?: boolean; // player view
};

export async function getNpcsByWorld(worldId: string, { factionId, q, visibleOnly = false }: GetNpcsOptions = {}) {
    const npcs = await db.npc.findMany({
        where: {
            worldId,
            ...(factionId && { factionId }),
            ...(visibleOnly && { isVisible: true }),
            ...(q && {
                OR: [
                    { name:    { contains: q, mode: 'insensitive' as const } },
                    { aliases: { contains: q, mode: 'insensitive' as const } },
                ],
            }),
        },
        orderBy: { name: 'asc' },
        include: {
            faction: { select: { id: true, name: true, slug: true, isVisible: true } },
            rank:    { select: { id: true, name: true, level: true } },
        },
    });
    return enrichNpcLocations(npcs);
}

// Public NPC directory — visible NPCs across all active worlds,
// searchable by name/aliases, filterable by world.
export async function getPublicNpcs(q?: string, worldId?: string) {
    const npcs = await db.npc.findMany({
        where: {
            isVisible: true,
            world:     { isActive: true },
            ...(worldId && { worldId }),
            ...(q && {
                OR: [
                    { name:    { contains: q, mode: 'insensitive' as const } },
                    { aliases: { contains: q, mode: 'insensitive' as const } },
                ],
            }),
        },
        orderBy: { name: 'asc' },
        include: {
            world:   { select: { id: true, name: true, slug: true } },
            faction: { select: { id: true, name: true, slug: true, isVisible: true } },
            rank:    { select: { id: true, name: true, level: true } },
        },
    });
    return enrichNpcLocations(npcs);
}

export async function getNpcById(id: string) {
    const npc = await db.npc.findUnique({
        where:   { id },
        include: {
            world:   { select: { id: true, name: true, slug: true, isActive: true } },
            faction: { select: { id: true, name: true, slug: true, isVisible: true } },
            rank:    { select: { id: true, name: true, level: true } },
            quests:  true,
        },
    });
    if (!npc) return null;

    const plotQuestIds = npc.quests.map(q => q.plotQuestId);
    const [plotQuests, location] = await Promise.all([
        plotQuestIds.length
            ? db.plotQuest.findMany({
                where: { id: { in: plotQuestIds } },
                select: { id: true, title: true, status: true, deadlineDay: true },
              })
            : Promise.resolve([]),
        npc.locationId
            ? db.location.findUnique({
                where:   { id: npc.locationId },
                select:  { id: true, name: true, slug: true, region: { select: { id: true, name: true, slug: true } } },
              })
            : Promise.resolve(null),
    ]);
    const plotMap = Object.fromEntries(plotQuests.map(q => [q.id, q]));

    return {
        ...npc,
        location,
        quests: npc.quests.map(q => ({ ...q, plotQuest: plotMap[q.plotQuestId] ?? null })),
    };
}

// Resolve locationId → location name (cross-schema, app-level) for list views.
async function enrichNpcLocations(npcs: any[]) {
    const locationIds = [...new Set(npcs.map(n => n.locationId).filter(Boolean))] as string[];
    if (!locationIds.length) return npcs.map(n => ({ ...n, location: null }));
    const locations = await db.location.findMany({
        where:  { id: { in: locationIds } },
        select: { id: true, name: true, slug: true, region: { select: { id: true, name: true, slug: true } } },
    });
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));
    return npcs.map(n => ({ ...n, location: n.locationId ? locationMap[n.locationId] ?? null : null }));
}
