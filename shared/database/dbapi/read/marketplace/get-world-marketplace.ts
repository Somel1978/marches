// shared/database/dbapi/read/marketplace/get-world-marketplace.ts
import { db } from '../../../index.ts';

export async function getWorldMarketplaceItems(worldId: string) {
    return db.worldMarketplaceItem.findMany({
        where:   { worldId },
        include: { item: true },
        orderBy: { item: { name: 'asc' } },
    });
}

export async function getWorldMarketplaceSetting(worldId: string) {
    return db.worldMarketplaceSetting.findUnique({ where: { worldId } });
}
