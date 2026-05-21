// shared/database/dbapi/write/characters/inventory.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function removeFromInventory(
    inventoryId: string,
    quantity: number,
    actorId: string,
    note?: string,
) {
    const entry = await db.characterInventory.findUnique({ where: { id: inventoryId } });
    if (!entry) throw new NotFoundError('CharacterInventory', inventoryId);
    if (quantity > entry.quantity) throw new ValidationError(`Only ${entry.quantity} in inventory.`);

    return db.$transaction(async (tx) => {
        const newQty = entry.quantity - quantity;

        if (newQty <= 0) {
            await tx.characterInventory.delete({ where: { id: inventoryId } });
        } else {
            await tx.characterInventory.update({
                where: { id: inventoryId },
                data:  { quantity: newQty },
            });
        }

        // Refund purchase price if set
        const refund = entry.purchasePrice ? entry.purchasePrice * quantity : 0;
        if (refund > 0) {
            await tx.character.update({
                where: { id: entry.characterId },
                data:  { totalGold: { increment: refund } },
            });
            await tx.characterTransaction.create({
                data: {
                    characterId: entry.characterId,
                    type:        'GOLD',
                    delta:       refund,
                    sourceType:  'ADMIN',
                    note:        `Refund for removed item: ${entry.itemName} ×${quantity}`,
                    createdBy:   actorId,
                },
            });
        }

        // Log removal on CharacterInventory (audit trail)
        await logAudit(tx, {
            actorId,
            action:      newQty <= 0 ? 'DELETE' : 'UPDATE',
            resourceKey: 'CharacterInventory',
            resourceId:  inventoryId,
            before:      { itemName: entry.itemName, quantity: entry.quantity, purchasePrice: entry.purchasePrice },
            after:       { quantity: newQty, refund, note },
        });

        // Log removal in character activity feed
        await tx.characterTransaction.create({
            data: {
                characterId: entry.characterId,
                type:        'ITEM',
                delta:       -quantity,
                sourceType:  'ADMIN',
                note:        note ?? `Removed ${quantity}x ${entry.itemName} from inventory${refund > 0 ? ` (+${refund} GP refunded)` : ''}`,
                createdBy:   actorId,
            },
        });
    });
}

export async function addToInventory(
    characterId: string,
    data: {
        itemId?:       string;
        itemName:      string;
        itemCategory?: string;
        itemRarity?:   string;
        itemSource?:   string;
        quantity:      number;
        purchasePrice?: number;
        sourceType:    'PURCHASE' | 'REWARD';
        notes?:        string;
    },
    actorId: string,
) {
    return db.$transaction(async (tx) => {
        // Upsert by itemId if present, else always create
        const existing = data.itemId
            ? await tx.characterInventory.findFirst({ where: { characterId, itemId: data.itemId } })
            : null;

        let entry;
        if (existing) {
            entry = await tx.characterInventory.update({
                where: { id: existing.id },
                data:  { quantity: { increment: data.quantity } },
            });
        } else {
            entry = await tx.characterInventory.create({
                data: {
                    characterId,
                    itemId:        data.itemId        ?? null,
                    itemName:      data.itemName,
                    itemCategory:  data.itemCategory  ?? null,
                    itemRarity:    data.itemRarity    ?? null,
                    itemSource:    data.itemSource    ?? null,
                    quantity:      data.quantity,
                    purchasePrice: data.purchasePrice ?? null,
                    sourceType:    data.sourceType,
                    notes:         data.notes         ?? null,
                },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'CharacterInventory',
            resourceId:  entry.id,
            after:       data,
        });

        return entry;
    });
}