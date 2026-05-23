// shared/database/dbapi/write/quests/item-usage.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { createNotificationsForAdmins, createNotification } from '../notifications/notifications.ts';

export async function submitItemUsages(
    questId:     string,
    usages:      { characterId: string; inventoryId: string; quantityUsed: number }[],
    submittedBy: string,
) {
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundError('Quest', questId);
    if (quest.status !== 'IN_PROGRESS') throw new ValidationError('Quest must be in progress.');

    // Validate inventory items exist and have sufficient quantity
    for (const u of usages) {
        const inv = await db.characterInventory.findUnique({ where: { id: u.inventoryId } });
        if (!inv) throw new NotFoundError('CharacterInventory', u.inventoryId);
        if (inv.quantity < u.quantityUsed) throw new ValidationError(`Insufficient quantity for item ${inv.itemName}.`);
    }

    const records = await db.$transaction(async (tx) => {
        const created = [];
        for (const u of usages) {
            const inv = await tx.characterInventory.findUnique({ where: { id: u.inventoryId }, select: { itemName: true } });
            created.push(await tx.questItemUsage.create({
                data: {
                    questId,
                    characterId:  u.characterId,
                    inventoryId:  u.inventoryId,
                    itemName:     inv?.itemName ?? u.inventoryId,
                    quantityUsed: u.quantityUsed,
                    submittedBy,
                    status:       'PENDING',
                },
            }));
        }
        return created;
    });

    await createNotificationsForAdmins(
        'ITEM_USAGE_PENDING', 'Item usage pending approval',
        `DM submitted item usage for quest "${quest.title}".`,
        `/quests/${questId}`,
    );

    return records;
}

export async function approveItemUsage(usageId: string, actorId: string) {
    const usage = await db.questItemUsage.findUnique({ where: { id: usageId } });
    if (!usage) throw new NotFoundError('QuestItemUsage', usageId);
    if (usage.status !== 'PENDING') throw new ValidationError('Usage is not pending.');

    await db.$transaction(async (tx) => {
        const inv = await tx.characterInventory.findUnique({ where: { id: usage.inventoryId } });
        if (!inv) throw new NotFoundError('CharacterInventory', usage.inventoryId);

        if (inv.quantity <= usage.quantityUsed) {
            await tx.characterInventory.delete({ where: { id: usage.inventoryId } });
        } else {
            await tx.characterInventory.update({
                where: { id: usage.inventoryId },
                data:  { quantity: { decrement: usage.quantityUsed } },
            });
        }

        await tx.questItemUsage.update({ where: { id: usageId }, data: { status: 'APPROVED', reviewedBy: actorId } });
        await tx.characterTransaction.create({ data: {
            characterId: usage.characterId,
            type:        'ITEM',
            delta:       -usage.quantityUsed,
            sourceType:  'QUEST',
            sourceId:    usage.questId,
            note:        `Item used in quest: ${usage.itemName} x${usage.quantityUsed}`,
            createdBy:   actorId,
        }});
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'QuestItemUsage', resourceId: usageId, after: { status: 'APPROVED' } });
    });
}

export async function rejectItemUsage(usageId: string, reviewNote: string, actorId: string) {
    const usage = await db.questItemUsage.findUnique({ where: { id: usageId } });
    if (!usage) throw new NotFoundError('QuestItemUsage', usageId);
    if (usage.status !== 'PENDING') throw new ValidationError('Usage is not pending.');

    await db.questItemUsage.update({ where: { id: usageId }, data: { status: 'REJECTED', reviewedBy: actorId, reviewNote } });

    // Notify DM
    const quest  = await db.quest.findUnique({ where: { id: usage.questId }, select: { dmProfileId: true, title: true } });
    const dmProf = quest ? await db.dMProfile.findUnique({ where: { id: quest.dmProfileId }, select: { userId: true } }) : null;
    if (dmProf) await createNotification(dmProf.userId, 'ITEM_USAGE_REJECTED', 'Item usage rejected',
        `Item usage for "${usage.itemName}" in quest "${quest?.title}" was rejected. ${reviewNote}`,
        `/dm/quests/${usage.questId}`);
}

export async function getItemUsagesForQuest(questId: string) {
    return db.questItemUsage.findMany({ where: { questId }, orderBy: { createdAt: 'desc' } });
}