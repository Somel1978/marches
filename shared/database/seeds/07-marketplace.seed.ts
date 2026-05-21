// shared/database/seeds/07-marketplace.seed.ts
import type { PrismaClient } from '@prisma/client';

export async function seedMarketplace(db: PrismaClient) {
    console.log('  └─ Seeding Marketplace...');

    // Resources
    const module = await db.module.findFirst({ where: { name: 'User Management' } });
    if (module) {
        const resources = [
            { key: 'MarketplaceItem',        displayName: 'Marketplace Items',   navVisibility: 'ANY'  as any, sortOrder: 8 },
            { key: 'MarketplaceTransaction',  displayName: 'Marketplace Transactions', navVisibility: 'NONE' as any, sortOrder: 9 },
        ];
        for (const r of resources) {
            await db.resource.upsert({
                where:  { key: r.key },
                update: {},
                create: { ...r, moduleId: module.id, description: r.displayName },
            });
        }
    }

    // Settings
    const settings = [
        { key: 'marketplace.sellPricePercent', value: '50',    description: 'Sell price as % of buy price',  isSecret: false },
        { key: 'marketplace.stockEnabled',     value: 'false', description: 'Enable stock management',       isSecret: false },
        { key: 'marketplace.levelRestrictions', value: JSON.stringify([
            { minLevel: 1,  maxLevel: 4,  maxRarity: 'Common',    maxValue: 100,   allowedCategories: [] },
            { minLevel: 5,  maxLevel: 8,  maxRarity: 'Uncommon',  maxValue: 500,   allowedCategories: [] },
            { minLevel: 9,  maxLevel: 12, maxRarity: 'Rare',      maxValue: 5000,  allowedCategories: [] },
            { minLevel: 13, maxLevel: 16, maxRarity: 'Very_Rare', maxValue: 25000, allowedCategories: [] },
            { minLevel: 17, maxLevel: 20, maxRarity: 'Legendary', maxValue: null,  allowedCategories: [] },
        ]), description: 'Level-based purchase restrictions (JSON)', isSecret: false },
    ];
    for (const s of settings) {
        await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    // PLAYER gets marketplace read
    const playerRole = await db.role.findUnique({ where: { name: 'PLAYER' } });
    if (playerRole) {
        await db.rolePermission.upsert({
            where:  { roleId_resourceKey: { roleId: playerRole.id, resourceKey: 'MarketplaceItem' } },
            update: {},
            create: { roleId: playerRole.id, resourceKey: 'MarketplaceItem', canCreate: 'NONE', canRead: 'ALL', canUpdate: 'NONE', canDelete: 'NONE' },
        });
    }

    console.log('     Marketplace: seeded');
}
