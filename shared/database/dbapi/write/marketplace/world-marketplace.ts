// shared/database/dbapi/write/marketplace/world-marketplace.ts
import { db } from '../../../index.ts';

export async function upsertWorldMarketplaceItem(
    worldId: string,
    itemId: string,
    data: { stock?: number | null; isAvailable?: boolean | null; priceOverride?: number | null },
) {
    return db.worldMarketplaceItem.upsert({
        where:  { worldId_itemId: { worldId, itemId } },
        create: { worldId, itemId, ...data },
        update: data,
    });
}

export async function deleteWorldMarketplaceItem(worldId: string, itemId: string) {
    return db.worldMarketplaceItem.delete({
        where: { worldId_itemId: { worldId, itemId } },
    });
}

export async function upsertWorldMarketplaceSetting(
    worldId: string,
    data: { sellPricePercent?: number | null; stockEnabled?: boolean | null; levelRestrictions?: any },
) {
    return db.worldMarketplaceSetting.upsert({
        where:  { worldId },
        create: { worldId, ...data },
        update: data,
    });
}
