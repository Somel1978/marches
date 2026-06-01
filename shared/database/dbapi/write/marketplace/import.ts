// shared/database/dbapi/write/marketplace/import.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';

export type ImportRow = {
    category:    string;
    name:        string;
    price:       number;
    baseItem:    string;
    variant:     string | number;
    rarity:      string;
    attunement:  string | number;
    requirements?: string;
    weight?:     number | string | null;
    source?:     string;
    imageUrl?:   string;
    link?:       string;
    description?: string;
};

const VALID_CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];
const VALID_RARITIES   = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact', 'Unknown'];

function normaliseRarity(r: string): string {
    const normalised = r.replace(' ', '_');
    return VALID_RARITIES.includes(normalised) ? normalised : 'Unknown';
}

function normaliseCategory(c: string): string {
    return VALID_CATEGORIES.includes(c) ? c : 'Utility';
}

export async function importMarketplaceItems(rows: ImportRow[], actorId?: string) {
    let created = 0;
    let updated = 0;
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.name?.trim()) continue;

        try {
            const existing = await db.marketplaceItem.findUnique({ where: { name: row.name } });

            await db.marketplaceItem.upsert({
                where:  { name: row.name },
                update: {
                    category:           normaliseCategory(row.category) as any,
                    baseItem:           row.baseItem       ?? row.name,
                    isVariant:          Boolean(row.variant),
                    rarity:             normaliseRarity(row.rarity) as any,
                    requiresAttunement: Boolean(row.attunement),
                    requirements:       row.requirements   || null,
                    weight:             row.weight ? Number(row.weight) : null,
                    source:             row.source         || null,
                    imageUrl:           row.imageUrl        || null,
                    link:               row.link            || null,
                    description:        row.description      || null,
                    buyPrice:           Number(row.price)   || 0,
                    isDestroyable:      row.category === 'Destroyable',
                },
                create: {
                    name:               row.name,
                    category:           normaliseCategory(row.category) as any,
                    baseItem:           row.baseItem       ?? row.name,
                    isVariant:          Boolean(row.variant),
                    rarity:             normaliseRarity(row.rarity) as any,
                    requiresAttunement: Boolean(row.attunement),
                    requirements:       row.requirements   || null,
                    weight:             row.weight ? Number(row.weight) : null,
                    source:             row.source         || null,
                    imageUrl:           row.imageUrl        || null,
                    link:               row.link            || null,
                    description:        row.description      || null,
                    buyPrice:           Number(row.price)   || 0,
                    isDestroyable:      row.category === 'Destroyable',
                    isAvailable:        true,
                },
            });

            if (existing) updated++; else created++;
        } catch (e: any) {
            errors.push({ row: i + 2, name: row.name, error: e.message });
        }
    }

    await db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'MarketplaceItem',
            resourceId:  'import',
            after:       { created, updated, errors: errors.length },
        });
    });

    return { created, updated, errors };
}