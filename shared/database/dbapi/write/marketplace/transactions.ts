// shared/database/dbapi/write/marketplace/transactions.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { createNotification, createNotificationsForAdmins } from '../notifications/notifications.ts';
import { resolveMarketplaceContext } from '../../read/marketplace/resolve-context.ts';
import { queueDiscordNotification } from '../discord/dispatcher';

const RARITY_ORDER = ['Mundane','Common','Uncommon','Rare','Very_Rare','Legendary','Artifact','Unknown'];

async function checkLevelRestrictions(characterId: string, item: any, effectivePrice: number, restrictions: any[]) {
    if (!restrictions?.length) return;

    const totalLevel = await db.characterClass.aggregate({
        where: { characterId },
        _sum:  { allocatedLevel: true },
    });
    const level = totalLevel._sum.allocatedLevel ?? 0;
    const tier  = restrictions.find((r: any) => level >= r.minLevel && level <= r.maxLevel);
    if (!tier) return;

    if (tier.maxRarity) {
        const itemIdx = RARITY_ORDER.indexOf(item.rarity);
        const maxIdx  = RARITY_ORDER.indexOf(tier.maxRarity);
        if (itemIdx > maxIdx)
            throw new ValidationError(`Your character level (${level}) cannot purchase ${item.rarity} items.`);
    }
    if (tier.maxValue !== undefined && tier.maxValue !== null && effectivePrice > tier.maxValue)
        throw new ValidationError(`Your character level (${level}) cannot purchase items above ${tier.maxValue} GP.`);
    if (tier.allowedCategories?.length && !tier.allowedCategories.includes(item.category))
        throw new ValidationError(`Your character level (${level}) cannot purchase ${item.category} items.`);
}

// ── Stock helpers ────────────────────────────────────────────────────────────

async function decrementStock(
    dbTx: any,
    itemId: string,
    worldId: string | null | undefined,
    stockRow: 'world' | 'global',
    quantity: number,
    stockEnabled: boolean,
    stock: number | null,
) {
    if (!stockEnabled || stock === null) return;
    if (stockRow === 'world' && worldId) {
        await dbTx.worldMarketplaceItem.update({
            where: { worldId_itemId: { worldId, itemId } },
            data:  { stock: { decrement: quantity } },
        });
    } else {
        await dbTx.marketplaceItem.update({
            where: { id: itemId },
            data:  { stock: { decrement: quantity } },
        });
    }
}

async function restoreStock(
    dbTx: any,
    itemId: string,
    worldId: string | null | undefined,
    quantity: number,
) {
    if (!worldId) {
        // Global restore
        const item = await dbTx.marketplaceItem.findUnique({ where: { id: itemId }, select: { stock: true } });
        if (item?.stock !== null) {
            await dbTx.marketplaceItem.update({ where: { id: itemId }, data: { stock: { increment: quantity } } });
        }
        return;
    }
    // World restore — check world row first
    const worldRow = await dbTx.worldMarketplaceItem.findUnique({
        where: { worldId_itemId: { worldId, itemId } },
        select: { stock: true },
    });
    if (worldRow && worldRow.stock !== null) {
        await dbTx.worldMarketplaceItem.update({
            where: { worldId_itemId: { worldId, itemId } },
            data:  { stock: { increment: quantity } },
        });
    } else {
        // Fall back to global
        const item = await dbTx.marketplaceItem.findUnique({ where: { id: itemId }, select: { stock: true } });
        if (item?.stock !== null) {
            await dbTx.marketplaceItem.update({ where: { id: itemId }, data: { stock: { increment: quantity } } });
        }
    }
}

// ── Buy ──────────────────────────────────────────────────────────────────────

export async function createBuyTransaction(
    characterId: string,
    itemId: string,
    quantity: number,
    requestedBy: string,
    worldId?: string | null,
) {
    const item = await db.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('MarketplaceItem', itemId);

    // Character's worldId is authoritative — a world-locked character always
    // buys in their world's economy regardless of what the frontend sends.
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);
    const effectiveWorldId = character.worldId ?? worldId ?? null;

    const ctx = await resolveMarketplaceContext(itemId, effectiveWorldId);

    if (!ctx.isAvailable) throw new ValidationError('Item is not available.');
    if (ctx.stockEnabled && ctx.stock !== null && ctx.stock < quantity)
        throw new ValidationError(`Only ${ctx.stock} in stock.`);

    await checkLevelRestrictions(characterId, item, ctx.price, ctx.levelRestrictions);

    const totalPrice = ctx.price * quantity;
    if (character.totalGold < totalPrice)
        throw new ValidationError(`Insufficient gold — you have ${character.totalGold.toLocaleString()} GP but need ${totalPrice.toLocaleString()} GP.`);

    return db.$transaction(async (dbTx) => {
        await dbTx.character.update({
            where: { id: characterId },
            data:  { totalGold: { decrement: totalPrice } },
        });

        await dbTx.characterTransaction.create({
            data: {
                characterId,
                type:       'GOLD',
                delta:      -totalPrice,
                sourceType: 'MARKETPLACE',
                note:       `Purchase pending: ${item.name} ×${quantity}`,
                createdBy:  requestedBy,
            },
        });

        const tx = await dbTx.marketplaceTransaction.create({
            data: {
                itemId,
                characterId,
                type:               'BUY',
                status:             'PENDING',
                quantity,
                priceAtTransaction: ctx.price,
                totalPrice,
                requestedBy,
                worldId:            effectiveWorldId ?? null,
            },
        });

        await createNotificationsForAdmins('MARKETPLACE_PENDING', 'Purchase request pending',
            `Purchase request for "${item.name}" ×${quantity} needs approval.`, '/marketplace/transactions');
        try {
            const buyChar = await db.character.findUnique({ where: { id: characterId }, select: { name: true } });
            await queueDiscordNotification('MARKET_PENDING', {
                char:    { name: buyChar?.name ?? '' },
                item:    { name: item.name, price: totalPrice },
                txType:  'BUY',
                worldId: effectiveWorldId ?? null,
            });
        } catch { /* discord not running */ }
        await logAudit(dbTx, { actorId: requestedBy, action: 'CREATE', resourceKey: 'MarketplaceTransaction',
            resourceId: tx.id, after: { type: 'BUY', itemId, characterId, quantity, totalPrice, worldId: effectiveWorldId } });

        return tx;
    });
}

// ── Sell ─────────────────────────────────────────────────────────────────────

export async function createSellTransaction(
    characterId: string,
    inventoryId: string,
    quantity: number,
    requestedBy: string,
) {
    const inv = await db.characterInventory.findUnique({ where: { id: inventoryId } });
    if (!inv)               throw new NotFoundError('CharacterInventory', inventoryId);
    if (!inv.canSell)       throw new ValidationError('This item cannot be sold — it was granted as a reward.');
    if (!inv.itemId)        throw new ValidationError('This item cannot be sold on the marketplace.');
    if (inv.quantity < quantity) throw new ValidationError(`Only ${inv.quantity} available to sell.`);

    const item = await db.marketplaceItem.findUnique({ where: { id: inv.itemId } });
    if (!item) throw new NotFoundError('MarketplaceItem', inv.itemId);

    // Use origin worldId for sell% resolution
    const ctx       = await resolveMarketplaceContext(inv.itemId, (inv as any).worldId);
    const sellPrice = Math.floor(ctx.price * (ctx.sellPricePercent / 100));
    const totalPrice = sellPrice * quantity;

    const tx = await db.marketplaceTransaction.create({
        data: {
            itemId:             item.id,
            characterId,
            type:               'SELL',
            status:             'PENDING',
            quantity,
            priceAtTransaction: sellPrice,
            totalPrice,
            requestedBy,
            worldId:            (inv as any).worldId ?? null,
        },
    });

    await db.$transaction(async (dbTx) => {
        await logAudit(dbTx, { actorId: requestedBy, action: 'CREATE', resourceKey: 'MarketplaceTransaction',
            resourceId: tx.id, after: { type: 'SELL', itemId: item.id, characterId, quantity, totalPrice, worldId: (inv as any).worldId } });
    });

    try {
        const sellChar = await db.character.findUnique({ where: { id: characterId }, select: { name: true } });
        await queueDiscordNotification('MARKET_PENDING', {
            char:    { name: sellChar?.name ?? '' },
            item:    { name: item.name, price: totalPrice },
            txType:  'SELL',
            worldId: (inv as any).worldId ?? null,
        });
    } catch { /* discord not running */ }

    return tx;
}

// ── Approve ──────────────────────────────────────────────────────────────────

export async function approveTransaction(id: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Transaction is not pending.');

    const worldId = (tx as any).worldId as string | null;

    return db.$transaction(async (dbTx) => {
        if (tx.type === 'BUY') {
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId, type: 'GOLD', delta: 0,
                    sourceType: 'MARKETPLACE', sourceId: id,
                    note: `Purchased ${tx.quantity}x ${tx.item.name}`, createdBy: actorId,
                },
            });

            const existing = await dbTx.characterInventory.findFirst({
                where: { characterId: tx.characterId, itemId: tx.itemId },
            });
            if (existing) {
                await dbTx.characterInventory.update({
                    where: { id: existing.id },
                    data:  { quantity: { increment: tx.quantity } },
                });
            } else {
                await dbTx.characterInventory.create({
                    data: {
                        characterId:   tx.characterId,
                        itemId:        tx.itemId,
                        itemName:      tx.item.name,
                        itemCategory:  tx.item.category,
                        itemRarity:    tx.item.rarity,
                        itemSource:    tx.item.source ?? null,
                        quantity:      tx.quantity,
                        purchasePrice: tx.priceAtTransaction,
                        sourceType:    'PURCHASE',
                        transactionId: id,
                        worldId:       worldId,
                    },
                });
            }

            // Decrement stock on correct row (world or global)
            const ctx = await resolveMarketplaceContext(tx.itemId, worldId);
            await decrementStock(dbTx, tx.itemId, worldId, ctx.stockRow, tx.quantity, ctx.stockEnabled, ctx.stock);

        } else if (tx.type === 'SELL') {
            await dbTx.character.update({
                where: { id: tx.characterId },
                data:  { totalGold: { increment: tx.totalPrice } },
            });
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId, type: 'GOLD', delta: tx.totalPrice,
                    sourceType: 'MARKETPLACE', sourceId: id,
                    note: `Sold ${tx.quantity}x ${tx.item.name}`, createdBy: actorId,
                },
            });

            const inv = await dbTx.characterInventory.findFirst({
                where: { characterId: tx.characterId, itemId: tx.itemId },
            });
            if (inv) {
                if (inv.quantity <= tx.quantity) {
                    await dbTx.characterInventory.delete({ where: { id: inv.id } });
                } else {
                    await dbTx.characterInventory.update({ where: { id: inv.id }, data: { quantity: { decrement: tx.quantity } } });
                }
            }

            // Restore stock to origin (inventory.worldId via transaction.worldId)
            await restoreStock(dbTx, tx.itemId, worldId, tx.quantity);
        }

        await dbTx.marketplaceTransaction.update({ where: { id }, data: { status: 'APPROVED', reviewedBy: actorId } });

        await logAudit(dbTx, { actorId, action: 'UPDATE', resourceKey: 'MarketplaceTransaction',
            resourceId: id, before: { status: 'PENDING' }, after: { status: 'APPROVED' } });

        try {
            const char = await db.character.findUnique({ where: { id: tx.characterId }, select: { name: true } });
            const worldId = (tx as any).worldId ?? null;
            if (tx.type === 'BUY') {
                await queueDiscordNotification('ITEM_PURCHASED', { char: { name: char?.name ?? '' }, item: { name: tx.item.name, buyPrice: tx.item.buyPrice }, worldId });
            } else {
                await queueDiscordNotification('ITEM_SOLD', { char: { name: char?.name ?? '' }, item: { name: tx.item.name }, price: tx.totalPrice, worldId });
            }
        } catch { /* discord not running */ }
    });
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectTransaction(id: string, reviewNote: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Transaction is not pending.');
    if (!reviewNote?.trim()) throw new ValidationError('Review note is required.');

    return db.$transaction(async (dbTx) => {
        const char = await dbTx.character.findUnique({ where: { id: tx.characterId }, select: { userId: true } }).catch(() => null);
        if (char) await createNotification(char.userId, 'MARKETPLACE_REJECTED', 'Purchase rejected',
            `Your purchase of "${tx.item?.name ?? 'item'}" was rejected. ${reviewNote}`, '/characters');

        await dbTx.marketplaceTransaction.update({ where: { id }, data: { status: 'REJECTED', reviewedBy: actorId, reviewNote } });

        if (tx.type === 'BUY') {
            await dbTx.character.update({ where: { id: tx.characterId }, data: { totalGold: { increment: tx.totalPrice } } });
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId, type: 'GOLD', delta: tx.totalPrice,
                    sourceType: 'MARKETPLACE', sourceId: id,
                    note: `Purchase rejected — refund: ${tx.item.name}`, createdBy: actorId,
                },
            });
        }

        await logAudit(dbTx, { actorId, action: 'UPDATE', resourceKey: 'MarketplaceTransaction',
            resourceId: id, before: { status: 'PENDING' }, after: { status: 'REJECTED', reviewNote } });
    });
}

// ── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelTransaction(id: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Only pending transactions can be cancelled.');
    if (tx.requestedBy !== actorId) throw new ValidationError('You can only cancel your own requests.');

    return db.$transaction(async (dbTx) => {
        await dbTx.marketplaceTransaction.update({ where: { id },
            data: { status: 'REJECTED', reviewedBy: actorId, reviewNote: 'Cancelled by player' } });

        if (tx.type === 'BUY') {
            await dbTx.character.update({ where: { id: tx.characterId }, data: { totalGold: { increment: tx.totalPrice } } });
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId, type: 'GOLD', delta: tx.totalPrice,
                    sourceType: 'MARKETPLACE', sourceId: id,
                    note: `Purchase cancelled — refund: ${(tx as any).item?.name ?? tx.itemId}`, createdBy: actorId,
                },
            });
        }

        await logAudit(dbTx, { actorId, action: 'UPDATE', resourceKey: 'MarketplaceTransaction',
            resourceId: id, before: { status: 'PENDING' }, after: { status: 'REJECTED', reviewNote: 'Cancelled by player' } });
    });
}

// ── Grant reward ─────────────────────────────────────────────────────────────

export async function grantRewardItem(
    characterId: string,
    itemId: string,
    quantity: number,
    actorId: string,
    note?: string,
) {
    const item = await db.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('MarketplaceItem', itemId);

    return db.$transaction(async (dbTx) => {
        const tx = await dbTx.marketplaceTransaction.create({
            data: {
                itemId, characterId, type: 'REWARD', status: 'APPROVED', quantity,
                priceAtTransaction: 0, totalPrice: 0, requestedBy: actorId, reviewedBy: actorId,
            },
        });

        const existing = await dbTx.characterInventory.findFirst({ where: { characterId, itemId } });
        if (existing) {
            await dbTx.characterInventory.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
        } else {
            await dbTx.characterInventory.create({
                data: {
                    characterId, itemId, itemName: item.name, itemCategory: item.category,
                    itemRarity: item.rarity, itemSource: item.source ?? null,
                    quantity, purchasePrice: 0, sourceType: 'REWARD', transactionId: tx.id,
                    // worldId null — rewards are not world-scoped
                },
            });
        }

        await logAudit(dbTx, { actorId, action: 'CREATE', resourceKey: 'MarketplaceTransaction',
            resourceId: tx.id, after: { type: 'REWARD', itemId, characterId, quantity, note } });
    });
}