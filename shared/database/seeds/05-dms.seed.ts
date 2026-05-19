// shared/database/seeds/05-dms.seed.ts
// DM Hub seed — adds DM role if not present
import type { PrismaClient } from '@prisma/client';

export async function seedDMs(db: PrismaClient) {
    console.log('  └─ Seeding DM Hub...');

    // Ensure DM role exists
    await db.role.upsert({
        where:  { name: 'DM' },
        update: {},
        create: {
            name:        'DM',
            description: 'Dungeon Master — can create and manage quests',
        },
    });

    // Add DMProfile and RoleRequest resources if not present
    const resources = [
        { key: 'DMProfile',   displayName: 'DM Profiles',   navVisibility: 'ANY' as any, sortOrder: 4 },
        { key: 'RoleRequest', displayName: 'Role Requests',  navVisibility: 'ALL' as any, sortOrder: 5 },
    ];

    for (const r of resources) {
        const module = await db.module.findFirst({ where: { name: 'User Management' } });
        if (!module) continue;
        await db.resource.upsert({
            where:  { key: r.key },
            update: {},
            create: { ...r, moduleId: module.id, description: r.displayName },
        });
    }

    // DM feature settings
    const dmSettings = [
        { key: 'dm.ratingsEnabled', value: 'false', description: 'Enable DM rating system', isSecret: false },
    ];
    for (const s of dmSettings) {
        await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    console.log('     DM Hub: seeded');
}