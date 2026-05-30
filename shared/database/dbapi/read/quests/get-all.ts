// shared/database/dbapi/read/quests/get-all.ts
import { db } from '../../../index.ts';

export type GetAllQuestsOptions = {
    status?:      string;
    dmProfileId?: string;
    worldId?:     string;
    page?:        number;
    perPage?:     number;
};

export async function getAllQuests({
    status, dmProfileId, worldId, page = 1, perPage = 20,
}: GetAllQuestsOptions = {}) {
    // Quest has no Prisma relation to Region (cross-schema FK).
    // Filter by worldId by first resolving the world's region IDs.
    let regionIds: string[] | undefined;
    if (worldId) {
        const regions = await db.region.findMany({
            where:  { worldId },
            select: { id: true },
        });
        regionIds = regions.map(r => r.id);
        // If the world has no regions, no quests can match
        if (regionIds.length === 0) {
            return { items: [], total: 0, page, perPage, totalPages: 0 };
        }
    }

    const where = {
        ...(status      && { status: status as any }),
        ...(dmProfileId && { dmProfileId }),
        ...(regionIds   && { regionId: { in: regionIds } }),
    };

    const [items, total] = await db.$transaction([
        db.quest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
            include: {
                rewards:  true,
                signups:  { where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } } },
                coDMs:    true,
            },
        }),
        db.quest.count({ where }),
    ]);

    // Enrich with DM user names
    const dmIds  = [...new Set(items.map(q => q.dmProfileId))];
    const dmProfiles = await db.dMProfile.findMany({ where: { id: { in: dmIds } } });
    const dmUserIds  = dmProfiles.map(p => p.userId);
    const dmUsers    = await db.user.findMany({ where: { id: { in: dmUserIds } }, select: { id: true, name: true } });
    const userMap    = Object.fromEntries(dmUsers.map(u => [u.id, u.name]));
    const profileMap = Object.fromEntries(dmProfiles.map(p => [p.id, userMap[p.userId] ?? p.userId]));

    // Enrich with region/location names
    const enrichRegionIds   = [...new Set(items.map(q => q.regionId).filter(Boolean))] as string[];
    const locationIds = [...new Set(items.map(q => q.locationId).filter(Boolean))] as string[];
    const [regions, locations] = await Promise.all([
        enrichRegionIds.length   ? db.region.findMany({ where: { id: { in: enrichRegionIds } }, select: { id: true, name: true, world: { select: { name: true } } } }) : [],
        locationIds.length ? db.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } }) : [],
    ]);
    const regionMap   = Object.fromEntries((regions as any[]).map(r => [r.id, { name: r.name, worldName: r.world?.name ?? null }]));
    const locationMap = Object.fromEntries((locations as any[]).map(l => [l.id, l.name]));

    return {
        items: items.map(q => ({
            ...q,
            dmName:       profileMap[q.dmProfileId] ?? q.dmProfileId,
            regionName:   q.regionId   ? (regionMap[q.regionId]?.name   ?? null) : null,
            worldName:    q.regionId   ? (regionMap[q.regionId]?.worldName ?? null) : null,
            locationName: q.locationId ? (locationMap[q.locationId]      ?? null) : null,
        })),
        total, page, perPage, totalPages: Math.ceil(total / perPage),
    };
}