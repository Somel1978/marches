// shared/database/dbapi/write/token-store/items.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function createTokenStoreItem(input: {
    name:         string;
    description?: string;
    imageUrl?:    string;
    tokenCost:    number;
    gameSystemId?: string;
    scope:        string;
    worldId?:     string;
    rewardType:   string;
    rewardValue:  any;
    isActive?:    boolean;
    stock?:       number;
}, actorId: string) {
    if (!input.name?.trim())      throw new ValidationError('Name is required.');
    if (input.tokenCost < 0)      throw new ValidationError('Token cost cannot be negative.');
    if (input.scope === 'WORLD' && !input.worldId) throw new ValidationError('World is required for WORLD-scoped items.');

    return db.$transaction(async (tx) => {
        const item = await tx.tokenStoreItem.create({
            data: {
                name:         input.name.trim(),
                description:  input.description  ?? null,
                imageUrl:     input.imageUrl      ?? null,
                tokenCost:    input.tokenCost,
                gameSystemId: input.gameSystemId  ?? null,
                scope:        input.scope as any,
                worldId:      input.worldId       ?? null,
                rewardType:   input.rewardType as any,
                rewardValue:  input.rewardValue,
                isActive:     input.isActive ?? true,
                stock:        input.stock    ?? null,
                createdBy:    actorId,
            },
        });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'TokenStoreItem', resourceId: item.id, after: item });
        return item;
    });
}

export async function updateTokenStoreItem(id: string, input: Partial<{
    name:         string;
    description:  string | null;
    imageUrl:     string | null;
    tokenCost:    number;
    gameSystemId: string | null;
    scope:        string;
    worldId:      string | null;
    rewardType:   string;
    rewardValue:  any;
    isActive:     boolean;
    stock:        number | null;
}>, actorId: string) {
    const item = await db.tokenStoreItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('TokenStoreItem', id);

    return db.$transaction(async (tx) => {
        const updated = await tx.tokenStoreItem.update({ where: { id }, data: input as any });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'TokenStoreItem', resourceId: id, before: item, after: updated });
        return updated;
    });
}

export async function deleteTokenStoreItem(id: string, actorId: string) {
    const item = await db.tokenStoreItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('TokenStoreItem', id);

    const txCount = await db.tokenStoreTransaction.count({ where: { itemId: id } });
    if (txCount > 0) throw new ValidationError('Cannot delete — item has transactions. Deactivate it instead.');

    return db.$transaction(async (tx) => {
        await tx.tokenStoreItem.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'TokenStoreItem', resourceId: id, before: item });
    });
}

export async function importTokenStoreItems(rows: any[], actorId: string) {
    let created = 0; let updated = 0; const errors: string[] = [];

    for (const r of rows) {
        try {
            const existing = await db.tokenStoreItem.findFirst({ where: { name: r.name } });
            const data = {
                name:         r.name,
                description:  r.description  || null,
                imageUrl:     r.imageUrl      || null,
                tokenCost:    Number(r.tokenCost) || 0,
                gameSystemId: r.gameSystemId  || null,
                scope:        r.scope         || 'GLOBAL',
                worldId:      r.worldId       || null,
                rewardType:   r.rewardType    || 'MANUAL',
                rewardValue:  typeof r.rewardValue === 'string' ? JSON.parse(r.rewardValue) : (r.rewardValue ?? {}),
                isActive:     r.isActive !== 'false' && r.isActive !== false,
                stock:        r.stock ? Number(r.stock) : null,
                createdBy:    actorId,
            };
            if (existing) {
                await db.tokenStoreItem.update({ where: { id: existing.id }, data });
                updated++;
            } else {
                await db.tokenStoreItem.create({ data: data as any });
                created++;
            }
        } catch (e: any) {
            errors.push(`Row "${r.name}": ${e.message}`);
        }
    }
    return { created, updated, errors };
}
