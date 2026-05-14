// shared/database/dbapi/read/platform/get-resources.ts
import { db } from '../../../index.ts';

// Returns all resources grouped by module, ordered by sortOrder.
// Used by the admin permission matrix to build resource rows dynamically.
export async function getResources() {
    return db.module.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { resources: { orderBy: { sortOrder: 'asc' } } },
    });
}

// Returns flat list of resource names for RBAC engine validation.
export async function getResourceNames(): Promise<string[]> {
    const resources = await db.resource.findMany({
        select:  { name: true },
        orderBy: { name: 'asc' },
    });
    return resources.map(r => r.name);
}
