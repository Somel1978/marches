// shared/database/dbapi/read/platform/get-resources.ts
import { db } from '../../../index.ts';

export async function getResources() {
    return db.module.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
            resources: {
                orderBy: { sortOrder: 'asc' },
                select: {
                    id:            true,
                    key:           true,
                    displayName:   true,
                    description:   true,
                    sortOrder:     true,
                    navVisibility: true,
                },
            },
        },
    });
}

export async function getResourceNames(): Promise<string[]> {
    const resources = await db.resource.findMany({
        select:  { key: true },
        orderBy: { key: 'asc' },
    });
    return resources.map(r => r.key);
}

// Returns resource nav visibility map keyed by resource key.
// Used by layout server to determine which nav items to show.
export async function getResourceNavVisibility(): Promise<Record<string, 'NONE' | 'ANY' | 'ALL'>> {
    const resources = await db.resource.findMany({
        select: { key: true, navVisibility: true },
    });
    return Object.fromEntries(resources.map(r => [r.key, r.navVisibility as 'NONE' | 'ANY' | 'ALL']));
}