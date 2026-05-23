// shared/database/dbapi/write/marketplace/transactions.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { createNotification, createNotificationsForAdmins } from '../notifications/notifications.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';

const RARITY_ORDER = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact', 'Unknown'];

async function checkLevelRestrictions(characterId: string, item: any) {
    const settings = await getSettingsMap();
    const restrictions = settings['marketplace.levelRestrictions'];
    if (!restrictions) return;

    const parsed: { minLevel: number; maxLevel: number; maxRarity?: string; maxValue?: number; allowedCategories?: string[] }[]
        = JSON.parse(restrictions);

    const totalLevel = await db.characterClass.aggregate({
        where: { characterId },
        _sum:  { allocatedLevel: true },
    });
    const level = totalLevel._sum.allocatedLevel ?? 0;

    const tier = parsed.find(r => level >= r.minLevel && level <= r.maxLevel);
    if (!tier) return; // no rule for this level

    if (tier.maxRarity) {
        const itemIdx   = RARITY_ORDER.indexOf(item.rarity);
        const maxIdx    = RARITY_ORDER.indexOf(tier.maxRarity);
        if (itemIdx > maxIdx)
            throw new ValidationError(`Your character level (${level}) cannot purchase ${item.rarity} items.`);
    }

    if (tier.maxValue !== undefined && item.buyPrice > tier.maxValue)
        throw new ValidationError(`Your character level (${level}) cannot purchase items above ${tier.maxValue} GP.`);

    if (tier.allowedCategories?.length && !tier.allowedCategories.includes(item.category))
        throw new ValidationError(`Your character level (${level}) cannot purchase ${item.category} items.`);
}

export async function createBuyTransaction(
    characterId: string,
    itemId: string,
    quantity: number,
    requestedBy: string,
) {
    const item = await db.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundError('MarketplaceItem', itemId);
    if (!item.isAvailable) throw new ValidationError('Item is not available.');

    const settings = await getSettingsMap();
    const stockEnabled = settings['marketplace.stockEnabled'] === 'true';
    if (stockEnabled && item.stock !== null && item.stock < quantity)
        throw new ValidationError(`Only ${item.stock} in stock.`);

    await checkLevelRestrictions(characterId, item);

    const totalPrice = item.buyPrice * quantity;

    // Check character has enough gold at request time
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);
    if (character.totalGold < totalPrice)
        throw new ValidationError(`Insufficient gold — you have ${character.totalGold.toLocaleString()} GP but need ${totalPrice.toLocaleString()} GP.`);

    return db.$transaction(async (dbTx) => {
        // Deduct gold immediately — held in reserve while PENDING
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
                priceAtTransaction: item.buyPrice,
                totalPrice,
                requestedBy,
            },
        });

        await createNotificationsForAdmins('MARKETPLACE_PENDING', 'Purchase request pending', `Purchase request for "${item.name}" ×${quantity} needs approval.`, '/marketplace/transactions');
        await logAudit(dbTx, { actorId: requestedBy, action: 'CREATE', resourceKey: 'MarketplaceTransaction', resourceId: tx.id, after: { type: 'BUY', itemId, characterId, quantity, totalPrice } });

        return tx;
    });
}

export async function createSellTransaction(
    characterId: string,
    inventoryId: string,
    quantity: number,
    requestedBy: string,
) {
    const inv = await db.characterInventory.findUnique({ where: { id: inventoryId } });
    if (!inv) throw new NotFoundError('CharacterInventory', inventoryId);
    if (inv.canSell === false) throw new ValidationError('This item cannot be sold — it was granted as a reward.');
    if (!inv.itemId) throw new ValidationError('This item cannot be sold on the marketplace.');
    if (inv.quantity < quantity) throw new ValidationError(`Only ${inv.quantity} available to sell.`);

    const item = await db.marketplaceItem.findUnique({ where: { id: inv.itemId } });
    if (!item) throw new NotFoundError('MarketplaceItem', inv.itemId);

    const settings  = await getSettingsMap();
    const sellPct   = Number(settings['marketplace.sellPricePercent'] ?? 50) / 100;
    const sellPrice = Math.floor(item.buyPrice * sellPct);
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
        },
    });

    await db.$transaction(async (dbTx) => {
        await logAudit(dbTx, {
            actorId:     requestedBy,
            action:      'CREATE',
            resourceKey: 'MarketplaceTransaction',
            resourceId:  tx.id,
            after:       { type: 'SELL', itemId: item.id, characterId, quantity, totalPrice },
        });
    });

    return tx;
}

export async function approveTransaction(id: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({
        where:   { id },
        include: { item: true },
    });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Transaction is not pending.');

    return db.$transaction(async (dbTx) => {
        if (tx.type === 'BUY') {
            // Gold was already deducted on request — just add item to inventory

            // Log the approval
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId,
                    type:        'GOLD',
                    delta:       0,
                    sourceType:  'MARKETPLACE',
                    sourceId:    id,
                    note:        `Purchased ${tx.quantity}x ${tx.item.name}`,
                    createdBy:   actorId,
                },
            });

            // Add to inventory (upsert by itemId)
            console.log('[approveTransaction] adding to inventory', {
                characterId: tx.characterId,
                itemId: tx.itemId,
                itemName: tx.item.name,
                quantity: tx.quantity,
            });
            const existing = await dbTx.characterInventory.findFirst({
                where: { characterId: tx.characterId, itemId: tx.itemId },
            });
            console.log('[approveTransaction] existing inventory entry:', existing);
            try {
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
                        },
                    });
                }
                console.log('[approveTransaction] inventory updated successfully');
            } catch (inventoryErr) {
                console.error('[approveTransaction] INVENTORY CREATE FAILED:', inventoryErr);
                throw inventoryErr;
            }

            // Decrement stock if stock management enabled
            const settings = await getSettingsMap();
            if (settings['marketplace.stockEnabled'] === 'true' && tx.item.stock !== null) {
                await dbTx.marketplaceItem.update({
                    where: { id: tx.itemId },
                    data:  { stock: { decrement: tx.quantity } },
                });
            }

        } else if (tx.type === 'SELL') {
            // Credit gold to character
            await dbTx.character.update({
                where: { id: tx.characterId },
                data:  { totalGold: { increment: tx.totalPrice } },
            });

            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId,
                    type:        'GOLD',
                    delta:       tx.totalPrice,
                    sourceType:  'MARKETPLACE',
                    sourceId:    id,
                    note:        `Sold ${tx.quantity}x ${tx.item.name}`,
                    createdBy:   actorId,
                },
            });

            // Remove from inventory
            const inv = await dbTx.characterInventory.findFirst({
                where: { characterId: tx.characterId, itemId: tx.itemId },
            });
            if (inv) {
                if (inv.quantity <= tx.quantity) {
                    await dbTx.characterInventory.delete({ where: { id: inv.id } });
                } else {
                    await dbTx.characterInventory.update({
                        where: { id: inv.id },
                        data:  { quantity: { decrement: tx.quantity } },
                    });
                }
            }
        }

        await dbTx.marketplaceTransaction.update({
            where: { id },
            data:  { status: 'APPROVED', reviewedBy: actorId },
        });

        await logAudit(dbTx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'MarketplaceTransaction',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: 'APPROVED' },
        });
    });
}

export async function rejectTransaction(id: string, reviewNote: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Transaction is not pending.');
    if (!reviewNote?.trim()) throw new ValidationError('Review note is required.');

    return db.$transaction(async (dbTx) => {
        const _cR = await dbTx.character.findUnique({ where: { id: tx.characterId }, select: { userId: true } }).catch(() => null);
        if (_cR) await createNotification(_cR.userId, 'MARKETPLACE_REJECTED', 'Purchase rejected', `Your purchase of "${tx.item?.name ?? 'item'}" was rejected. ${reviewNote}`, '/characters');
        await dbTx.marketplaceTransaction.update({ where: { id }, data: { status: 'REJECTED', reviewedBy: actorId, reviewNote } });

        // Refund gold for BUY rejections
        if (tx.type === 'BUY') {
            await dbTx.character.update({
                where: { id: tx.characterId },
                data:  { totalGold: { increment: tx.totalPrice } },
            });
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId,
                    type:        'GOLD',
                    delta:       tx.totalPrice,
                    sourceType:  'MARKETPLACE',
                    sourceId:    id,
                    note:        `Purchase rejected — refund: ${tx.item.name}`,
                    createdBy:   actorId,
                },
            });
        }

        await logAudit(dbTx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'MarketplaceTransaction',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: 'REJECTED', reviewNote },
        });
    });
}

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
        // Create approved transaction at zero cost
        const tx = await dbTx.marketplaceTransaction.create({
            data: {
                itemId,
                characterId,
                type:               'REWARD',
                status:             'APPROVED',
                quantity,
                priceAtTransaction: 0,
                totalPrice:         0,
                requestedBy:        actorId,
                reviewedBy:         actorId,
            },
        });

        // Add to inventory directly
        const existing = await dbTx.characterInventory.findFirst({
            where: { characterId, itemId },
        });
        if (existing) {
            await dbTx.characterInventory.update({
                where: { id: existing.id },
                data:  { quantity: { increment: quantity } },
            });
        } else {
            await dbTx.characterInventory.create({
                data: {
                    characterId,
                    itemId,
                    itemName:      item.name,
                    itemCategory:  item.category,
                    itemRarity:    item.rarity,
                    itemSource:    item.source ?? null,
                    quantity,
                    purchasePrice: 0,
                    sourceType:    'REWARD',
                    transactionId: tx.id,
                },
            });
        }

        await logAudit(dbTx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'MarketplaceTransaction',
            resourceId:  tx.id,
            after:       { type: 'REWARD', itemId, characterId, quantity, note },
        });
    });
}

export async function cancelTransaction(id: string, actorId: string) {
    const tx = await db.marketplaceTransaction.findUnique({
        where:   { id },
        include: { item: true },
    });
    if (!tx) throw new NotFoundError('MarketplaceTransaction', id);
    if (tx.status !== 'PENDING') throw new ValidationError('Only pending transactions can be cancelled.');
    if (tx.requestedBy !== actorId) throw new ValidationError('You can only cancel your own requests.');

    return db.$transaction(async (dbTx) => {
        await dbTx.marketplaceTransaction.update({
            where: { id },
            data:  { status: 'REJECTED', reviewedBy: actorId, reviewNote: 'Cancelled by player' },
        });

        // Refund gold
        if (tx.type === 'BUY') {
            await dbTx.character.update({
                where: { id: tx.characterId },
                data:  { totalGold: { increment: tx.totalPrice } },
            });
            await dbTx.characterTransaction.create({
                data: {
                    characterId: tx.characterId,
                    type:        'GOLD',
                    delta:       tx.totalPrice,
                    sourceType:  'MARKETPLACE',
                    sourceId:    id,
                    note:        `Purchase cancelled — refund: ${(tx as any).item?.name ?? tx.itemId}`,
                    createdBy:   actorId,
                },
            });
        }

        await logAudit(dbTx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'MarketplaceTransaction',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: 'REJECTED', reviewNote: 'Cancelled by player' },
        });
    });
}