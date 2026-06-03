// shared/database/dbapi/read/quests/get-by-id.ts
import { db } from '../../../index.ts';
import { enrichDnd5eSignups } from '../dnd5e/enrich-signups.ts';

export async function getQuestById(id: string) {
    const quest = await db.quest.findUnique({
        where:   { id },
        include: {
            coDMs:   true,
            rewards: true,
            signups: { orderBy: { signedUpAt: 'asc' } },
            result:  { include: { characters: true } },
        },
    });
    if (!quest) return null;

    const enrichedSignups = await enrichDnd5eSignups(quest.signups);

    // Enrich with region and location names
    let regionName:   string | null = null;
    let locationName: string | null = null;

    // Enrich DM name
    let dmName: string | null = null;
    const dmProfile = await db.dMProfile.findUnique({
        where:  { id: quest.dmProfileId },
        select: { userId: true },
    }).catch(() => null);
    if (dmProfile) {
        const dmUser = await db.user.findUnique({
            where:  { id: dmProfile.userId },
            select: { name: true },
        }).catch(() => null);
        dmName = dmUser?.name ?? null;
    }

    if (quest.regionId) {
        const region = await db.region.findUnique({
            where:  { id: quest.regionId },
            select: { name: true, world: { select: { name: true } } },
        }).catch(() => null);
        regionName = region?.name ?? null;
        (quest as any).__worldName = (region as any)?.world?.name ?? null;
    }
    if (quest.locationId) {
        const location = await db.location.findUnique({
            where:  { id: quest.locationId },
            select: { name: true },
        }).catch(() => null);
        locationName = location?.name ?? null;
    }

    return { ...quest, signups: enrichedSignups, regionName, locationName, worldName: (quest as any).__worldName ?? null, dmName };
}

export async function getQuestsByDM(dmProfileId: string) {
    const items = await db.quest.findMany({
        where:   {
            OR: [
                { dmProfileId },
                { coDMs: { some: { dmProfileId } } },
            ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
            rewards: true,
            signups: { where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } } },
        },
    });

    const regionIds   = [...new Set(items.map(q => q.regionId).filter(Boolean))] as string[];
    const locationIds = [...new Set(items.map(q => q.locationId).filter(Boolean))] as string[];
    const [regions, locations] = await Promise.all([
        regionIds.length   ? db.region.findMany({ where: { id: { in: regionIds } }, select: { id: true, name: true, world: { select: { name: true } } } }) : [],
        locationIds.length ? db.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } }) : [],
    ]);
    const regionMap   = Object.fromEntries((regions as any[]).map(r => [r.id, { name: r.name, worldName: r.world?.name ?? null }]));
    const locationMap = Object.fromEntries((locations as any[]).map(l => [l.id, l.name]));

    return items.map(q => ({
        ...q,
        regionName:   q.regionId   ? (regionMap[q.regionId]?.name      ?? null) : null,
        worldName:    q.regionId   ? (regionMap[q.regionId]?.worldName  ?? null) : null,
        locationName: q.locationId ? (locationMap[q.locationId]         ?? null) : null,
    }));
}

export async function getQuestResultWithCharacters(questId: string) {
    const result = await db.questResult.findUnique({
        where:   { questId },
        include: { characters: true },
    });
    if (!result?.characters?.length) return null;

    const charIds = result.characters.map(c => c.characterId);
    const chars   = await db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true } });
    const charMap = Object.fromEntries(chars.map(c => [c.id, c.name]));

    return {
        ...result,
        characters: result.characters.map(c => ({
            ...c,
            characterName: charMap[c.characterId] ?? c.characterId,
        })),
    };
}