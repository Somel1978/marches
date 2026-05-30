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
            dms: { orderBy: { assignedAt: 'asc' } },
            regions: {
                orderBy: { name: 'asc' },
                include: { dms: true, locations: { orderBy: { name: 'asc' } } },
            },
        },
    });
}

export async function getWorldsByDMProfile(dmProfileId: string) {
    const assignments = await db.worldDM.findMany({
        where:   { dmProfileId },
        include: {
            world: {
                include: {
                    // Include ALL regions and locations — no isActive filter.
                    // DMs manage their worlds fully; filtering is a UI concern.
                    regions: {
                        orderBy: { name: 'asc' },
                        include: {
                            locations: { orderBy: { name: 'asc' } },
                        },
                    },
                },
            },
        },
        orderBy: { assignedAt: 'asc' },
    });
    return assignments.map(a => ({ ...a.world, canManage: a.canManage }));
}