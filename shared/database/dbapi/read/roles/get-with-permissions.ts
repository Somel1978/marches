// shared/database/dbapi/read/roles/get-with-permissions.ts
import { db } from '../../../index.ts';

export async function getWithPermissions(roleId: string) {
    return db.role.findUnique({
        where:   { id: roleId },
        include: {
            permissions: { orderBy: { resourceKey: 'asc' } },
            _count: { select: { userRoles: true } },
        },
    });
}

// Returns all roles with full permission matrix.
// Used by the admin permission matrix UI — cross-references platform.Resource
// to show all resources even if no permission row exists yet for a role.
export async function getAllWithPermissions() {
    return db.role.findMany({
        orderBy: { name: 'asc' },
        include: { permissions: { orderBy: { resourceKey: 'asc' } } },
    });
}