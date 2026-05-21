// shared/database/dbapi/read/characters/get-inventory.ts
import { db } from '../../../index.ts';

export async function getCharacterInventory(characterId: string) {
    const items = await db.characterInventory.findMany({
        where:   { characterId },
        orderBy: { acquiredAt: 'desc' },
    });

    // Enrich with live marketplace price where itemId exists
    const itemIds = items.map(i => i.itemId).filter(Boolean) as string[];
    const liveItems = itemIds.length
        ? await db.marketplaceItem.findMany({
            where:  { id: { in: itemIds } },
            select: { id: true, buyPrice: true, isAvailable: true, rarity: true, imageUrl: true },
          })
        : [];

    const liveMap = Object.fromEntries(liveItems.map(i => [i.id, i]));

    return items.map(i => ({
        ...i,
        livePrice:   i.itemId ? (liveMap[i.itemId]?.buyPrice ?? null)       : null,
        liveRarity:  i.itemId ? (liveMap[i.itemId]?.rarity   ?? null)       : null,
        imageUrl:    i.itemId ? (liveMap[i.itemId]?.imageUrl  ?? null)       : null,
        isAvailable: i.itemId ? (liveMap[i.itemId]?.isAvailable ?? null)    : null,
    }));
}