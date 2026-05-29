// shared/database/dbapi/read/marketplace/resolve-context.ts
import { db } from '../../../index.ts';
import { getSettingsMap } from '../platform/get-settings.ts';

export interface MarketplaceContext {
  price:             number;
  isAvailable:       boolean;
  stock:             number | null;          // null = unlimited
  stockRow:          'world' | 'global';     // where to decrement/restore
  sellPricePercent:  number;
  stockEnabled:      boolean;
  levelRestrictions: any[];
}

/**
 * Resolves effective marketplace settings for an item in a world context.
 * worldId = null → global behaviour (no overrides).
 * Resolution: WorldMarketplaceItem → MarketplaceItem (global)
 *             WorldMarketplaceSetting → platform.Setting (global)
 */
export async function resolveMarketplaceContext(
  itemId: string,
  worldId: string | null | undefined,
): Promise<MarketplaceContext> {
  const [item, settings] = await Promise.all([
    db.marketplaceItem.findUnique({ where: { id: itemId } }),
    getSettingsMap(),
  ]);

  if (!item) throw new Error(`Item ${itemId} not found`);

  // Global defaults
  const globalSellPct    = Number(settings['marketplace.sellPricePercent'] ?? 50);
  const globalStockEnabled = settings['marketplace.stockEnabled'] !== 'false';
  const globalRestrictions = (() => {
    try { return JSON.parse(settings['marketplace.levelRestrictions'] ?? '[]'); }
    catch { return []; }
  })();

  // No world context — return global
  if (!worldId) {
    return {
      price:             item.buyPrice,
      isAvailable:       item.isAvailable,
      stock:             item.stock ?? null,
      stockRow:          'global',
      sellPricePercent:  globalSellPct,
      stockEnabled:      globalStockEnabled,
      levelRestrictions: globalRestrictions,
    };
  }

  const [worldItem, worldSetting] = await Promise.all([
    db.worldMarketplaceItem.findUnique({ where: { worldId_itemId: { worldId, itemId } } }),
    db.worldMarketplaceSetting.findUnique({ where: { worldId } }),
  ]);

  return {
    price:             worldItem?.priceOverride  ?? item.buyPrice,
    isAvailable:       worldItem?.isAvailable    ?? item.isAvailable,
    stock:             worldItem !== null
      ? (worldItem.stock ?? null)   // world row exists — use its stock (null = unlimited)
      : (item.stock ?? null),       // no world row — use global stock
    stockRow:          worldItem !== null ? 'world' : 'global',
    sellPricePercent:  worldSetting?.sellPricePercent  ?? globalSellPct,
    stockEnabled:      worldSetting?.stockEnabled      ?? globalStockEnabled,
    levelRestrictions: worldSetting?.levelRestrictions
      ? (worldSetting.levelRestrictions as any[])
      : globalRestrictions,
  };
}
