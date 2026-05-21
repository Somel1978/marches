// shared/database/seeds/08-world.seed.ts
import type { PrismaClient } from '@prisma/client';

export async function seedWorld(db: PrismaClient) {
    console.log('  └─ Seeding World System...');

    const module = await db.module.findFirst({ where: { name: 'User Management' } });
    if (module) {
        const resources = [
            { key: 'World',    displayName: 'Worlds',    navVisibility: 'ANY'  as any, sortOrder: 10 },
            { key: 'Region',   displayName: 'Regions',   navVisibility: 'ANY'  as any, sortOrder: 11 },
            { key: 'Location', displayName: 'Locations', navVisibility: 'ANY'  as any, sortOrder: 12 },
            { key: 'WikiPage', displayName: 'Wiki',      navVisibility: 'ANY'  as any, sortOrder: 13 },
        ];
        for (const r of resources) {
            await db.resource.upsert({
                where:  { key: r.key },
                update: {},
                create: { ...r, moduleId: module.id, description: r.displayName },
            });
        }
    }

    // PLAYER gets World/Region/Location/Wiki read
    const playerRole = await db.role.findUnique({ where: { name: 'PLAYER' } });
    if (playerRole) {
        for (const resourceKey of ['World', 'Region', 'Location', 'WikiPage']) {
            await db.rolePermission.upsert({
                where:  { roleId_resourceKey: { roleId: playerRole.id, resourceKey } },
                update: {},
                create: { roleId: playerRole.id, resourceKey, canCreate: 'NONE', canRead: 'ALL', canUpdate: 'NONE', canDelete: 'NONE' },
            });
        }
    }

    // DM gets World/Region/Location/Wiki read + WikiPage write (OWN)
    const dmRole = await db.role.findUnique({ where: { name: 'DM' } });
    if (dmRole) {
        await db.rolePermission.upsert({
            where:  { roleId_resourceKey: { roleId: dmRole.id, resourceKey: 'WikiPage' } },
            update: {},
            create: { roleId: dmRole.id, resourceKey: 'WikiPage', canCreate: 'OWN', canRead: 'ALL', canUpdate: 'OWN', canDelete: 'NONE' },
        });
        for (const resourceKey of ['World', 'Region', 'Location']) {
            await db.rolePermission.upsert({
                where:  { roleId_resourceKey: { roleId: dmRole.id, resourceKey } },
                update: {},
                create: { roleId: dmRole.id, resourceKey, canCreate: 'NONE', canRead: 'ALL', canUpdate: 'NONE', canDelete: 'NONE' },
            });
        }
    }

    // World settings
    const settings = [
        { key: 'world.showDangerRating', value: 'true',  description: 'Show danger rating on regions and locations', isSecret: false },
        { key: 'world.showLevelRange',   value: 'true',  description: 'Show level range on regions and locations',   isSecret: false },
    ];
    for (const s of settings) {
        await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    console.log('     World System: seeded');
}