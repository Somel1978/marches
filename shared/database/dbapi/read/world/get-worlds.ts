// shared/database/dbapi/read/world/get-worlds.ts
import { db } from '../../../index.ts';

export async function getAllWorlds() {
    return db.world.findMany({
        orderBy: { name: 'asc' },
        include: { regions: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
}

export async function getWorldBySlug(slug: string) {
    return db.world.findUnique({
        where:   { slug },
        include: {
            regions: {
                orderBy: { name: 'asc' },
                include: { dms: true, locations: { where: { isActive: true }, orderBy: { name: 'asc' } } },
            },
        },
    });
}

export async function getWorldById(id: string) {
    return db.world.findUnique({
        where:   { id },
        include: {
            regions: {
                orderBy: { name: 'asc' },
                include: { dms: true, locations: { orderBy: { name: 'asc' } } },
            },
        },
    });
}
