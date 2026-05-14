// shared/database/seeds/02-roles.seed.ts

// ── Roles Seed (order: 02) ────────────────────────────────────────────────────
// Depends on: 01-platform.seed.ts
// resourceKey values here must exactly match platform.Resource.key.
// The cross-schema FK enforces this at DB level — seed will fail if a key
// does not exist in platform.resources.
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
        description: 'Full platform access',
        permissions: [
            { resourceKey: 'System',     canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
            { resourceKey: 'Module',     canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
            { resourceKey: 'Resource',   canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
            { resourceKey: 'AuditLog',   canCreate: 'ALL', canRead: 'ALL', canUpdate: 'NONE', canDelete: 'NONE' },
            { resourceKey: 'User',       canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
            { resourceKey: 'Role',       canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
            { resourceKey: 'Permission', canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' },
        ],
    },
    {
        name:        'PLAYER',
        description: 'Standard player — owns their own profile',
        permissions: [
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