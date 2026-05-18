// shared/database/seeds/02-roles.seed.ts

// ── Roles Seed (order: 02) ────────────────────────────────────────────────────
// Depends on: 01-platform.seed.ts
// resourceKey values must exactly match platform.Resource.key.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';

const ROLES: {
    name:        string;
    description: string;
    permissions: {
        resourceKey: string;
        canCreate:   'NONE' | 'OWN' | 'ALL';
        canRead:     'NONE' | 'OWN' | 'ALL';
        canUpdate:   'NONE' | 'OWN' | 'ALL';
        canDelete:   'NONE' | 'OWN' | 'ALL';
    }[];
}[] = [
    {
        name:        'SUPERADMIN',
        description: 'Full platform access — bypasses permission checks entirely via RBAC engine',
        permissions: [],  // SUPERADMIN uses sentinel bypass in getUserPermissions, no explicit grants needed
    },
    {
        name:        'PLAYER',
        description: 'Standard player — can only read and update their own profile',
        permissions: [
            // Players can only access their own User record.
            // No System access = cannot enter admin panel.
            // No Role/Permission access = cannot see RBAC resources.
            { resourceKey: 'User', canCreate: 'NONE', canRead: 'OWN', canUpdate: 'OWN', canDelete: 'NONE' },
        ],
    },
];

export async function seedRoles(db: PrismaClient) {
    console.log('  └─ Seeding Roles...');

    for (const role of ROLES) {
        const created = await db.role.upsert({
            where:  { name: role.name },
            update: {},
            create: { name: role.name, description: role.description },
        });

        for (const perm of role.permissions) {
            await db.rolePermission.upsert({
                where:  { roleId_resourceKey: { roleId: created.id, resourceKey: perm.resourceKey } },
                update: { canCreate: perm.canCreate, canRead: perm.canRead, canUpdate: perm.canUpdate, canDelete: perm.canDelete },
                create: { roleId: created.id, resourceKey: perm.resourceKey, canCreate: perm.canCreate, canRead: perm.canRead, canUpdate: perm.canUpdate, canDelete: perm.canDelete },
            });
        }

        console.log(`     Role: ${role.name} (${role.permissions.length} permissions)`);
    }
}