// shared/database/dbapi/read/roles/get-all.ts
import { db } from '../../../index.ts';

export async function getAll() {
    return db.role.findMany({
        orderBy: { name: 'asc' },
        select: {
            id:          true,
            name:        true,
            description: true,
            createdAt:   true,
            _count: { select: { userRoles: true } },
        },
    });
}
