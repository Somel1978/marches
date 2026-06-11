// shared/database/dbapi/write/token-store/transactions.ts
import { db } from '../../../index.ts';
import { applyBoostPerQuest } from './apply-boosts.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { createNotificationsForAdmins, createNotificationsForWorldDMs, createNotification } from '../notifications/notifications.ts';
import { queueDiscordNotification } from '../discord/dispatcher.ts';
import { checkLevelChange } from '../characters/level-check.ts';

// ── Apply boost ───────────────────────────────────────────────────────────────

async function applyBoost(tx: any, characterId: string, stTxId: string, item: any): Promise<string | null> {
    const rv   = (typeof item.rewardValue === 'string' ? JSON.parse(item.rewardValue) : item.rewardValue) as any;
    const pct  = Number(rv?.percent ?? 0);
    if (!pct)  return null;

    const type: 'XP' | 'GOLD' = item.rewardType === 'XP_BOOST' ? 'XP' : 'GOLD';
    const dir  = rv?.direction ?? 'BOTH';

    let bonus = 0;

    // Calculate retrospective bonus if applicable
    if (dir === 'RETROSPECTIVE' || dir === 'BOTH') {
        const where: any = { characterId, type, sourceType: 'QUEST' };

        if (item.scope === 'WORLD' && item.worldId) {
            // CharacterTransaction.sourceId for QUEST type = questId
            // Filter to only quests in this world via region
            const worldRegions = await db.region.findMany({
                where:  { worldId: item.worldId },
                select: { id: true },
            });
            const regionIds = worldRegions.map((r: any) => r.id);
            const worldQuests = await db.quest.findMany({
                where:  { regionId: { in: regionIds } },
                select: { id: true },
            });
            const worldQuestIds = worldQuests.map((q: any) => q.id);
            where.sourceId = { in: worldQuestIds };
        }

        const pastTxs = await db.characterTransaction.findMany({ where, select: { delta: true } });
        const total   = pastTxs.reduce((s: number, t: any) => s + (t.delta ?? 0), 0);
        if (total > 0) bonus = Math.floor(total * (pct / 100));
    }

    const field = type === 'XP' ? 'totalXp' : 'totalGold';
    const char  = await tx.character.findUnique({
        where:  { id: characterId },
        select: { totalXp: true, totalGold: true, level: true, userId: true, gameSystemId: true },
    });
    const prev = char[field];

    // Apply retrospective bonus if any
    if (bonus > 0) {
        await tx.character.update({ where: { id: characterId }, data: { [field]: { increment: bonus } } });
    }

    // Always create a transaction record so it shows on the character
    const dirLabel = dir === 'FUTURE' ? 'future quests' : dir === 'RETROSPECTIVE' ? 'past quests' : 'past & future quests';
    const rewardTx = await tx.characterTransaction.create({
        data: {
            characterId,
            type,
            delta:      bonus,   // 0 for FUTURE-only or no past quests — still records the boost
            fromValue:  String(prev),
            toValue:    String(prev + bonus),
            sourceType: 'REWARD',
            sourceId:   stTxId,
            note:       `Token boost active: ${item.name} (+${pct}% ${type} on ${dirLabel})${bonus > 0 ? ` — applied +${bonus} retroactively` : ''}`,
            createdBy:  stTxId,
        },
    });

    if (bonus > 0 && type === 'XP') {
        await checkLevelChange(tx, characterId, char.userId, char.gameSystemId, prev, prev + bonus, char.level, stTxId);
    }

    return rewardTx.id;
}

// ── Purchase (tokens deducted immediately, status PENDING) ───────────────────

export async function createTokenStorePurchase(
    characterId: string,
    itemId:       string,
    requestedBy:  string,
) {
    const item = await db.tokenStoreItem.findUnique({ where: { id: itemId } });
    if (!item)         throw new NotFoundError('TokenStoreItem', itemId);
    if (!item.isActive) throw new ValidationError('This item is not available.');

    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character)    throw new NotFoundError('Character', characterId);
    if (!['ACTIVE','RESTING'].includes(character.status)) throw new ValidationError('Only active characters can purchase token items.');

    // Game system check
    if (item.gameSystemId && item.gameSystemId !== character.gameSystemId)
        throw new ValidationError('This item is not available for your character\'s game system.');

    // World scope check
    if (item.scope === 'WORLD' && item.worldId && character.worldId !== item.worldId)
        throw new ValidationError('This item is only available to characters in a specific world.');

    // Stock check
    if (item.stock !== null && item.stock <= 0) throw new ValidationError('This item is out of stock.');

    // Token balance check
    if (character.totalTokens < item.tokenCost)
        throw new ValidationError(`Insufficient tokens — you have ${character.totalTokens} but need ${item.tokenCost}.`);

    return db.$transaction(async (tx) => {
        // Deduct tokens immediately
        await tx.character.update({ where: { id: characterId }, data: { totalTokens: { decrement: item.tokenCost } } });
        await tx.characterTransaction.create({
            data: {
                characterId, type: 'TOKEN', delta: -item.tokenCost,
                sourceType: 'MARKETPLACE', note: `Token store purchase pending: ${item.name}`, createdBy: requestedBy,
            },
        });

        const stTx = await tx.tokenStoreTransaction.create({
            data: {
                itemId, characterId,
                itemSnapshot:           item,
                status:                 'PENDING',
                tokenCostAtTransaction: item.tokenCost,
                requestedBy,
                worldId:                character.worldId ?? null,
            },
        });

        // Notifications
        await createNotificationsForAdmins('TOKEN_STORE_PENDING', 'Token store purchase pending',
            `"${character.name}" wants to purchase "${item.name}".`, '/token-store/transactions');
        if (character.worldId) {
            await createNotificationsForWorldDMs(character.worldId, 'TOKEN_STORE_PENDING', 'Token store purchase pending',
                `"${character.name}" wants to purchase "${item.name}".`,
                `/dm/worlds/${character.worldId}/token-store/transactions`);
        }
        try {
            await queueDiscordNotification('TOKEN_STORE_PENDING', {
                char: { name: character.name }, item: { name: item.name, tokenCost: item.tokenCost }, worldId: character.worldId ?? null,
            });
        } catch { /* discord not running */ }

        await logAudit(tx, { actorId: requestedBy, action: 'CREATE', resourceKey: 'TokenStoreTransaction', resourceId: stTx.id, after: stTx });
        return stTx;
    });
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approveTokenStorePurchase(id: string, actorId: string) {
    const stTx = await db.tokenStoreTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!stTx)                      throw new NotFoundError('TokenStoreTransaction', id);
    if (stTx.status !== 'PENDING')  throw new ValidationError('Transaction is not pending.');

    return db.$transaction(async (tx) => {
        if (stTx.item.rewardType !== 'MANUAL') {
            const rv  = (typeof stTx.item.rewardValue === 'string' ? JSON.parse(stTx.item.rewardValue) : stTx.item.rewardValue) as any;
            const dir = rv?.direction ?? 'BOTH';
            const boostDir = (dir === 'FUTURE' ? 'FUTURE' : dir === 'RETROSPECTIVE' ? 'RETROSPECTIVE' : 'BOTH') as 'RETROSPECTIVE' | 'FUTURE' | 'BOTH';
            await applyBoostPerQuest(tx, stTx.characterId, id, stTx.item, boostDir);
        }

        // Decrement stock if applicable
        if (stTx.item.stock !== null) {
            await tx.tokenStoreItem.update({ where: { id: stTx.itemId }, data: { stock: { decrement: 1 } } });
        }

        await tx.tokenStoreTransaction.update({
            where: { id },
            data:  { status: 'APPROVED', reviewedBy: actorId },
        });

        // Notify character owner
        const char = await tx.character.findUnique({ where: { id: stTx.characterId }, select: { userId: true, name: true } });
        if (char) {
            await createNotification(char.userId, 'TOKEN_STORE_APPROVED', 'Token store purchase approved',
                `Your purchase of "${stTx.item.name}" has been approved.`, '/token-store');
        }

        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'TokenStoreTransaction',
            resourceId: id, before: { status: 'PENDING' }, after: { status: 'APPROVED' } });
    });
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectTokenStorePurchase(id: string, reviewNote: string, actorId: string) {
    const stTx = await db.tokenStoreTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!stTx)                     throw new NotFoundError('TokenStoreTransaction', id);
    if (stTx.status !== 'PENDING') throw new ValidationError('Transaction is not pending.');
    if (!reviewNote?.trim())       throw new ValidationError('Review note is required.');

    return db.$transaction(async (tx) => {
        // Refund tokens
        await tx.character.update({ where: { id: stTx.characterId }, data: { totalTokens: { increment: stTx.tokenCostAtTransaction } } });
        await tx.characterTransaction.create({
            data: {
                characterId: stTx.characterId, type: 'TOKEN', delta: stTx.tokenCostAtTransaction,
                sourceType: 'MARKETPLACE', sourceId: id,
                note: `Token store rejected — refund: ${stTx.item.name}`, createdBy: actorId,
            },
        });

        await tx.tokenStoreTransaction.update({ where: { id }, data: { status: 'REJECTED', reviewedBy: actorId, reviewNote } });

        const char = await tx.character.findUnique({ where: { id: stTx.characterId }, select: { userId: true } });
        if (char) {
            await createNotification(char.userId, 'TOKEN_STORE_REJECTED', 'Token store purchase rejected',
                `Your purchase of "${stTx.item.name}" was rejected. ${reviewNote}`, '/token-store');
        }

        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'TokenStoreTransaction',
            resourceId: id, before: { status: 'PENDING' }, after: { status: 'REJECTED', reviewNote } });
    });
}

// ── Revoke (admin only) ───────────────────────────────────────────────────────

export async function revokeTokenStorePurchase(id: string, actorId: string): Promise<{ warning?: string }> {
    const stTx = await db.tokenStoreTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!stTx)                      throw new NotFoundError('TokenStoreTransaction', id);
    if (stTx.status !== 'APPROVED') throw new ValidationError('Only approved transactions can be revoked.');

    // Find all boost CharacterTransactions for this token store transaction (sourceType=QUEST, note contains id)
    const rewardTxs = await db.characterTransaction.findMany({
        where: { sourceType: 'QUEST', note: { contains: id } },
    });

    const char = await db.character.findUnique({ where: { id: stTx.characterId },
        select: { totalXp: true, totalGold: true, totalTokens: true, level: true, userId: true, gameSystemId: true, name: true } });
    if (!char) throw new NotFoundError('Character', stTx.characterId);

    // Check for warnings — sum all boost txs
    const totalBoostXp   = rewardTxs.filter((t: any) => t.type === 'XP').reduce((s: number, t: any) => s + (t.delta ?? 0), 0);
    const totalBoostGold = rewardTxs.filter((t: any) => t.type === 'GOLD').reduce((s: number, t: any) => s + (t.delta ?? 0), 0);
    let warning: string | undefined;
    if (totalBoostXp > 0) {
        const newXp = char.totalXp - totalBoostXp;
        const thresholds = await db.progressionThreshold.findMany({
            where: { gameSystemId: char.gameSystemId }, orderBy: { xpRequired: 'asc' },
        });
        const newLevel = thresholds.filter((t: any) => newXp >= t.xpRequired).length;
        if (newLevel < char.level) warning = `This will cause a level-down from ${char.level} to ${newLevel}.`;
    }
    if (totalBoostGold > 0) {
        const newGold = char.totalGold - totalBoostGold;
        if (newGold < 0) warning = `This will put the character ${Math.abs(newGold)} GP into negative.`;
    }

    return db.$transaction(async (tx) => {
        // Reverse all boost transactions by deleting them and adjusting totals
        for (const rewardTx of rewardTxs) {
            if ((rewardTx.delta ?? 0) <= 0) continue;
            const field = rewardTx.type === 'XP' ? 'totalXp' : 'totalGold';
            await tx.character.update({ where: { id: stTx.characterId }, data: { [field]: { decrement: rewardTx.delta! } } });
            await tx.characterTransaction.update({
                where: { id: rewardTx.id },
                data:  { delta: 0, note: `${rewardTx.note} [REVOKED]` },
            });
        }
        if (totalBoostXp > 0) {
            await checkLevelChange(tx, stTx.characterId, char.userId, char.gameSystemId,
                char.totalXp, char.totalXp - totalBoostXp, char.level, actorId);
        }

        // Refund tokens
        await tx.character.update({ where: { id: stTx.characterId }, data: { totalTokens: { increment: stTx.tokenCostAtTransaction } } });
        await tx.characterTransaction.create({
            data: {
                characterId: stTx.characterId, type: 'TOKEN', delta: stTx.tokenCostAtTransaction,
                sourceType: 'MARKETPLACE', sourceId: id,
                note: `Token store revoked — refund: ${stTx.item.name}`, createdBy: actorId,
            },
        });

        await tx.tokenStoreTransaction.update({ where: { id }, data: { status: 'REVOKED', reviewedBy: actorId } });

        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'TokenStoreTransaction',
            resourceId: id, before: { status: 'APPROVED' }, after: { status: 'REVOKED' } });

        return { warning };
    });
}

// ── Recalculate retrospective boost for already-approved transactions ─────────
export async function recalculateTokenStoreBoost(id: string, actorId: string) {
    const stTx = await db.tokenStoreTransaction.findUnique({ where: { id }, include: { item: true } });
    if (!stTx)                      throw new NotFoundError('TokenStoreTransaction', id);
    if (stTx.status !== 'APPROVED') throw new ValidationError('Only approved transactions can be recalculated.');
    if (stTx.item.rewardType === 'MANUAL') throw new ValidationError('Manual rewards cannot be recalculated.');

    const rv  = (typeof stTx.item.rewardValue === 'string' ? JSON.parse(stTx.item.rewardValue) : stTx.item.rewardValue) as any;
    const dir = rv?.direction ?? 'BOTH';
    if (dir === 'FUTURE') throw new ValidationError('Future-only boosts are applied at quest time — nothing to recalculate.');

    return db.$transaction(async (tx) => {
        const count = await applyBoostPerQuest(tx, stTx.characterId, id, stTx.item, dir);
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'TokenStoreTransaction', resourceId: id,
            after: { recalculated: true, newBoostTxs: count } });
        const type: 'XP' | 'GOLD' = stTx.item.rewardType === 'XP_BOOST' ? 'XP' : 'GOLD';
        return { message: count > 0 ? `Boost recalculated: ${count} quest(s) boosted with ${type}.` : 'No new quests to boost — all already applied.' };
    });
}