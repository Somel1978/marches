// shared/database/dbapi/read/factions/get-factions.ts
import { db } from '../../../index.ts';

export type GetFactionsOptions = {
    visibleOnly?: boolean; // true = player view, hides isVisible=false factions
};

export async function getFactionsByWorld(worldId: string, { visibleOnly = false }: GetFactionsOptions = {}) {
    return db.faction.findMany({
        where: {
            worldId,
            ...(visibleOnly && { isVisible: true }),
        },
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { npcs: true, ranks: true, renown: true } },
        },
    });
}

// Full faction with all sub-entities, enriched with cross-schema names.
// Used by admin + DM hub editors and (field-stripped) by the player route.
export async function getFactionById(id: string) {
    const faction = await db.faction.findUnique({
        where:   { id },
        include: {
            ranks:       { orderBy: { level: 'asc' } },
            territories: true,
            renown:      { orderBy: { value: 'desc' } },
            quests:      true,
            npcs:        {
                orderBy: { name: 'asc' },
                include: { rank: { select: { id: true, name: true, level: true } } },
            },
            relationsFrom: { include: { target:  { select: { id: true, name: true, slug: true, isVisible: true } } } },
            relationsTo:   { include: { faction: { select: { id: true, name: true, slug: true, isVisible: true } } } },
        },
    });
    if (!faction) return null;
    return enrichFaction(faction);
}

export async function getFactionBySlug(worldId: string, slug: string) {
    const faction = await db.faction.findUnique({
        where:   { worldId_slug: { worldId, slug } },
        include: {
            ranks:       { orderBy: { level: 'asc' } },
            territories: true,
            renown:      true,
            quests:      true,
            npcs:        {
                where:   { isVisible: true },
                orderBy: { name: 'asc' },
                include: { rank: { select: { id: true, name: true, level: true } } },
            },
            relationsFrom: { include: { target:  { select: { id: true, name: true, slug: true, isVisible: true } } } },
            relationsTo:   { include: { faction: { select: { id: true, name: true, slug: true, isVisible: true } } } },
        },
    });
    if (!faction) return null;
    return enrichFaction(faction);
}

// Resolve cross-schema references: territories → region/location names,
// plot-quest links → plot title/status, renown rows → character name + owner.
async function enrichFaction(faction: any) {
    const regionIds     = faction.territories.filter((t: any) => t.entityType === 'REGION').map((t: any) => t.entityId);
    const locationIds   = faction.territories.filter((t: any) => t.entityType === 'LOCATION').map((t: any) => t.entityId);
    const plotQuestIds  = faction.quests.map((q: any) => q.plotQuestId);
    const charIds       = faction.renown.map((r: any) => r.characterId);

    const [regions, locations, plotQuests, chars] = await Promise.all([
        regionIds.length   ? db.region.findMany({   where: { id: { in: regionIds } },   select: { id: true, name: true, slug: true, worldId: true } }) : Promise.resolve([]),
        locationIds.length ? db.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true, slug: true, regionId: true } }) : Promise.resolve([]),
        plotQuestIds.length ? db.plotQuest.findMany({ where: { id: { in: plotQuestIds } }, select: { id: true, title: true, status: true, deadlineDay: true } }) : Promise.resolve([]),
        charIds.length     ? db.character.findMany({ where: { id: { in: charIds } },    select: { id: true, name: true, userId: true, level: true, avatarUrl: true } }) : Promise.resolve([]),
    ]);

    const regionMap   = Object.fromEntries(regions.map(r => [r.id, r]));
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));
    const plotMap     = Object.fromEntries(plotQuests.map(q => [q.id, q]));
    const charMap     = Object.fromEntries(chars.map(c => [c.id, c]));

    return {
        ...faction,
        territories: faction.territories.map((t: any) => ({
            ...t,
            entity: t.entityType === 'REGION' ? regionMap[t.entityId] ?? null : locationMap[t.entityId] ?? null,
        })),
        quests: faction.quests.map((q: any) => ({ ...q, plotQuest: plotMap[q.plotQuestId] ?? null })),
        renown: faction.renown.map((r: any) => ({ ...r, character: charMap[r.characterId] ?? null })),
        // Merge both relation directions into a single list of "other faction + type"
        relations: [
            ...faction.relationsFrom.map((r: any) => ({ id: r.id, type: r.type, notes: r.notes, other: r.target,  owned: true  })),
            ...faction.relationsTo.map((r: any)   => ({ id: r.id, type: r.type, notes: r.notes, other: r.faction, owned: false })),
        ],
    };
}

// Renown map for one character across all factions of a world.
// Missing faction = neutral (0) — caller defaults.
export async function getFactionRenownForCharacter(characterId: string, worldId?: string) {
    return db.factionRenown.findMany({
        where: {
            characterId,
            ...(worldId && { faction: { worldId } }),
        },
        include: { faction: { select: { id: true, name: true, slug: true, isVisible: true, worldId: true } } },
    });
}
