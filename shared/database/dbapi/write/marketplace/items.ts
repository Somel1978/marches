// shared/database/dbapi/write/marketplace/items.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export async function upsertMarketplaceItem(
    data: {
        name:               string;
        category:           string;
        baseItem:           string;
        isVariant?:         boolean;
        rarity?:            string;
        requiresAttunement?: boolean;
        requirements?:      string;
        weight?:            number;
        source?:            string;
        imageUrl?:          string;
        link?:              string;
        description?:       string;
        buyPrice?:          number;
        isDestroyable?:     boolean;
        isAvailable?:       boolean;
        stock?:             number | null;
    },
    actorId?: string,
) {
    const existing = await db.marketplaceItem.findUnique({ where: { name: data.name } });

    const result = await db.marketplaceItem.upsert({
        where:  { name: data.name },
        update: {
            category:           data.category as any,
            baseItem:           data.baseItem,
            isVariant:          data.isVariant          ?? false,
            rarity:             data.rarity as any      ?? 'Mundane',
            requiresAttunement: data.requiresAttunement ?? false,
            requirements:       data.requirements       ?? null,
            weight:             data.weight             ?? null,
            source:             data.source             ?? null,
            imageUrl:           data.imageUrl           ?? null,
            link:               data.link               ?? null,
            description:        data.description        ?? null,
            buyPrice:           data.buyPrice           ?? 0,
            isDestroyable:      data.isDestroyable      ?? false,
        },
        create: {
            name:               data.name,
            category:           data.category as any,
            baseItem:           data.baseItem,
            isVariant:          data.isVariant          ?? false,
            rarity:             (data.rarity as any)    ?? 'Mundane',
            requiresAttunement: data.requiresAttunement ?? false,
            requirements:       data.requirements       ?? null,
            weight:             data.weight             ?? null,
            source:             data.source             ?? null,
            imageUrl:           data.imageUrl           ?? null,
            link:               data.link               ?? null,
            description:        data.description        ?? null,
            buyPrice:           data.buyPrice           ?? 0,
            isDestroyable:      data.isDestroyable      ?? false,
            isAvailable:        data.isAvailable        ?? true,
            stock:              data.stock              ?? null,
        },
    });

    await db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      existing ? 'UPDATE' : 'CREATE',
            resourceKey: 'MarketplaceItem',
            resourceId:  result.id,
            before:      existing,
            after:       result,
        });
    });

    return result;
}

export async function updateMarketplaceItem(
    id: string,
    data: { isAvailable?: boolean; stock?: number | null; buyPrice?: number },
    actorId?: string,
) {
    const item = await db.marketplaceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('MarketplaceItem', id);

    const updated = await db.marketplaceItem.update({ where: { id }, data });

    await db.$transaction(async (tx) => {
        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'MarketplaceItem',
            resourceId:  id,
            before:      item,
            after:       updated,
        });
    });

    return updated;
}

export async function deleteMarketplaceItem(id: string, actorId?: string) {
    const item = await db.marketplaceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('MarketplaceItem', id);
    await db.$transaction(async (tx) => {
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'MarketplaceItem', resourceId: id, before: item });
        await tx.marketplaceItem.delete({ where: { id } });
    });
}