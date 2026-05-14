// shared/database/seeds/01-platform.seed.ts

// ── Platform Registry Seed (order: 01) ───────────────────────────────────────
// Runs first — no dependencies.
// Resource.key is the immutable contract used by RolePermission.resourceKey.
// Resource.displayName is the human-readable label shown in the UI.
// Roles seed (02) depends on these keys being present.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';

const MODULES: {
    name:        string;
    description: string;
    sortOrder:   number;
    resources: {
        key:         string;   // immutable — used as FK in RolePermission
        displayName: string;   // mutable — shown in UI
        description: string;
        sortOrder:   number;
    }[];
}[] = [
    {
        name:        'Platform',
        description: 'Core platform administration',
        sortOrder:   0,
        resources: [
            { key: 'System',   displayName: 'System',           description: 'Global system settings', sortOrder: 0 },
            { key: 'Module',   displayName: 'Modules',          description: 'Feature module registry', sortOrder: 1 },
            { key: 'Resource', displayName: 'Resources',        description: 'Resource registry',       sortOrder: 2 },
            { key: 'AuditLog', displayName: 'Audit Log',        description: 'Platform audit trail',    sortOrder: 3 },
        ],
    },
    {
        name:        'User Management',
        description: 'Users, roles and permissions',
        sortOrder:   1,
        resources: [
            { key: 'User',       displayName: 'Users',       description: 'User accounts',    sortOrder: 0 },
            { key: 'Role',       displayName: 'Roles',       description: 'Roles',            sortOrder: 1 },
            { key: 'Permission', displayName: 'Permissions', description: 'Role permissions', sortOrder: 2 },
        ],
    },
    // Add new modules here as features are built.
    // Remember: key is immutable once set. displayName can be changed freely.
];

export async function seedPlatform(db: PrismaClient) {
    console.log('  └─ Seeding Platform...');

    for (const mod of MODULES) {
        const module = await db.module.upsert({
            where:  { name: mod.name },
            update: {},
            create: { name: mod.name, description: mod.description, sortOrder: mod.sortOrder },
        });

        for (const res of mod.resources) {
            await db.resource.upsert({
                where:  { key: res.key },
                update: { displayName: res.displayName },  // displayName is safe to update
                create: {
                    key:         res.key,
                    displayName: res.displayName,
                    description: res.description,
                    sortOrder:   res.sortOrder,
                    moduleId:    module.id,
                },
            });
        }

        console.log(`     Module: ${mod.name} (${mod.resources.length} resources)`);
    }
}