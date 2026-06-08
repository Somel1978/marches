// shared/database/dbapi/read/marketplace/get-items.ts
import { db } from '../../../index.ts';

export type GetItemsOptions = {
    category?:   string;
    rarity?:     string;
    search?:     string;
    available?:  boolean;
    page?:       number;
    perPage?:    number;
    minPrice?:   number;
    maxPrice?:   number;
    source?:        string;
    attunement?:    boolean;
    maxRarity?:     string;
    sortBy?:     string;
    sortDir?:    string;
};

const RARITY_ORDER = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact', 'Unknown'];

export async function getMarketplaceItems({
    category, rarity, search, available, page = 1, perPage = 20, minPrice, maxPrice, source, attunement, maxRarity,
    sortBy = 'name', sortDir = 'asc',
}: GetItemsOptions = {}) {
    const where: any = {
        ...(category  && { category: category as any }),
        ...(rarity    && { rarity: rarity as any }),
        ...(available !== undefined && { isAvailable: available }),
        ...(search    && { name: { contains: search, mode: 'insensitive' } }),
        ...((minPrice !== undefined || maxPrice !== undefined) && {
            buyPrice: {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
            },
        }),
        ...(source       && { source: { contains: source, mode: 'insensitive' } }),
        ...(attunement !== undefined && { requiresAttunement: attunement }),
    };

    if (maxRarity) {
        const idx = RARITY_ORDER.indexOf(maxRarity);
        if (idx >= 0) {
            where.rarity = { in: RARITY_ORDER.slice(0, idx + 1) as any[] };
        }
    }

    const validSortFields: Record<string, any> = {
        name:      { name: sortDir },
        category:  { category: sortDir },
        rarity:    { rarity: sortDir },
        buyPrice:  { buyPrice: sortDir },
        source:    { source: sortDir },
    };
    const orderBy = validSortFields[sortBy] ?? { name: 'asc' };

    const [items, total] = await db.$transaction([
        db.marketplaceItem.findMany({
            where,
            orderBy,
            skip:    (page - 1) * perPage,
            take:    perPage,
        }),
        db.marketplaceItem.count({ where }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}


export async function searchMarketplaceItems(query: string, excludeIds: string[] = [], limit = 20) {
    if (!query || query.length < 2) return [];
    const where: any = {
        name: { contains: query, mode: 'insensitive' },
        ...(excludeIds.length && { id: { notIn: excludeIds } }),
    };
    return db.marketplaceItem.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        select: { id: true, name: true, baseItem: true, rarity: true, buyPrice: true, category: true },
    });
}

export async function getAllMarketplaceItemsForExport() {
    return db.marketplaceItem.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: {
            category:           true,
            name:               true,
            buyPrice:           true,
            baseItem:           true,
            isVariant:          true,
            rarity:             true,
            requiresAttunement: true,
            requirements:       true,
            weight:             true,
            source:             true,
            imageUrl:           true,
            link:               true,
            description:        true,
        },
    });
}

export async function getMarketplaceItemById(id: string) {
    return db.marketplaceItem.findUnique({ where: { id } });
}

export async function getMarketplaceItemByName(name: string) {
    return db.marketplaceItem.findUnique({ where: { name } });
}