// shared/database/dbapi/read/world/get-regions.ts
import { db } from '../../../index.ts';

export async function getRegionBySlug(worldId: string, slug: string) {
    return db.region.findUnique({
        where:   { worldId_slug: { worldId, slug } },
        include: {
            world:     true,
            dms:       true,
            locations: { orderBy: { name: 'asc' } },
        },
    });
}

export async function getRegionById(id: string) {
    return db.region.findUnique({
        where:   { id },
        include: {
            world:     true,
            dms:       true,
            locations: { orderBy: { name: 'asc' } },
        },
    });
}

export async function getLocationBySlug(regionId: string, slug: string) {
    return db.location.findUnique({
        where:   { regionId_slug: { regionId, slug } },
        include: { region: { include: { world: true } } },
    });
}
