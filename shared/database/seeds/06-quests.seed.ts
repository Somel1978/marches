// shared/database/seeds/06-quests.seed.ts
import type { PrismaClient } from '@prisma/client';

export async function seedQuests(db: PrismaClient) {
    console.log('  └─ Seeding Quest System...');

    // Quest resources
    const module = await db.module.findFirst({ where: { name: 'User Management' } });
    if (module) {
        const resources = [
            { key: 'Quest',       displayName: 'Quests',        navVisibility: 'ANY'  as any, sortOrder: 6 },
            { key: 'QuestResult', displayName: 'Quest Results', navVisibility: 'NONE' as any, sortOrder: 7 },
        ];
        for (const r of resources) {
            await db.resource.upsert({
                where:  { key: r.key },
                update: {},
                create: { ...r, moduleId: module.id, description: r.displayName },
            });
        }
    }

    // Quest settings
    const settings = [
        { key: 'quest.minCapacity', value: '2', description: 'Global minimum players per quest', isSecret: false },
        { key: 'quest.destroyableCategories', value: '', description: 'Comma-separated inventory categories DMs can see and mark as used during IN_PROGRESS quests', isSecret: false },
        { key: 'quest.maxCapacity', value: '6', description: 'Global maximum players per quest', isSecret: false },
    ];
    for (const s of settings) {
        await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    // DM role gets Quest permissions
    const dmRole = await db.role.findUnique({ where: { name: 'DM' } });
    if (dmRole) {
        await db.rolePermission.upsert({
            where:  { roleId_resourceKey: { roleId: dmRole.id, resourceKey: 'Quest' } },
            update: {},
            create: { roleId: dmRole.id, resourceKey: 'Quest', canCreate: 'OWN', canRead: 'ALL', canUpdate: 'OWN', canDelete: 'OWN' },
        });
    }

    // Player role gets Quest read
    const playerRole = await db.role.findUnique({ where: { name: 'PLAYER' } });
    if (playerRole) {
        await db.rolePermission.upsert({
            where:  { roleId_resourceKey: { roleId: playerRole.id, resourceKey: 'Quest' } },
            update: {},
            create: { roleId: playerRole.id, resourceKey: 'Quest', canCreate: 'NONE', canRead: 'ALL', canUpdate: 'NONE', canDelete: 'NONE' },
        });
    }

    console.log('     Quest System: seeded');
}