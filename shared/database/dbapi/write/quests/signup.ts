// shared/database/dbapi/write/quests/signup.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError, ConflictError } from '@core/errors';
import { createNotification } from '../notifications/notifications.ts';

const PENDING_CONFIRMATION_EXPIRY_HOURS = 8;

export async function signupForQuest(questId: string, characterId: string, actorId: string) {
    const quest = await db.quest.findUnique({
        where:   { id: questId },
    });
    if (!quest)                       throw new NotFoundError('Quest', questId);
    if (quest.status !== 'PUBLISHED') throw new ValidationError('Quest is not open for signups.');

    // Check character exists and is eligible
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);

    // Block characters with pending level changes — they must resolve these first
    if (character.statusReason === 'LEVEL_UP_PENDING') {
        throw new ValidationError('Character has unallocated level-up. Please update your character sheet before signing up.');
    }
    if (character.statusReason === 'LEVEL_DOWN_PENDING') {
        throw new ValidationError('Character has a required level reduction pending. Please update your character sheet before signing up.');
    }

    const level = character.level ?? 0;
    if (level < quest.minLevel || level > quest.maxLevel)
        throw new ValidationError(`Character level ${level} is outside the quest range (${quest.minLevel}–${quest.maxLevel}).`);

    const existing = await db.questSignup.findUnique({
        where: { questId_characterId: { questId, characterId } },
    });
    if (existing && existing.status !== 'CANCELLED')
        throw new ConflictError('Character is already signed up for this quest.');

    return db.$transaction(async (tx) => {
        // Count inside transaction to reduce race condition window
        const confirmedCount = await tx.questSignup.count({
            where: { questId, status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } },
        });
        const status = confirmedCount < quest.maxCapacity ? 'CONFIRMED' : 'WAITLIST';

        const signup = existing
            ? await tx.questSignup.update({ where: { id: existing.id }, data: { status: status as any, cancelNote: null, promotedAt: null } })
            : await tx.questSignup.create({ data: { questId, characterId, status: status as any } });

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'Quest',
            resourceId:  questId,
            after:       { characterId, status },
        });

        return signup;
    });
}

export async function cancelSignup(signupId: string, cancelNote: string | undefined, actorId: string) {
    const signup = await db.questSignup.findUnique({
        where:   { id: signupId },
        include: { quest: { select: { title: true } } },
    });
    if (!signup) throw new NotFoundError('QuestSignup', signupId);

    // Load waitlist separately
    const waitlist = await db.questSignup.findMany({
        where:   { questId: signup.questId, status: 'WAITLIST' as any },
        orderBy: { signedUpAt: 'asc' },
        take:    1,
    });

    // Look up character userIds separately (cross-schema — no direct relation)
    const charIds = [signup.characterId, ...(waitlist.map((s: any) => s.characterId))];
    const charList = await db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, userId: true } });
    const charUserMap = Object.fromEntries(charList.map((c: any) => [c.id, c.userId]));

    const wasConfirmed = signup.status === 'CONFIRMED';

    await db.$transaction(async (tx) => {
        await tx.questSignup.update({
            where: { id: signupId },
            data:  { status: 'CANCELLED', cancelNote: cancelNote ?? null },
        });

        // Auto-promote first waitlist entry to PENDING_CONFIRMATION
        const nextWaitlist = waitlist[0];
        if (nextWaitlist) {
            await tx.questSignup.update({
                where: { id: nextWaitlist.id },
                data:  { status: 'PENDING_CONFIRMATION', promotedAt: new Date() },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Quest',
            resourceId:  signup.questId,
            before:      { signupId, status: signup.status },
            after:       { status: 'CANCELLED', cancelNote },
        });
    });

    // Notify the cancelled player
    const cancelledUserId = charUserMap[signup.characterId];
    if (cancelledUserId && wasConfirmed) {
        await createNotification(
            cancelledUserId,
            'QUEST_SIGNUP_CANCELLED',
            'Quest signup cancelled',
            `Your signup for "${(signup as any).quest?.title}" has been cancelled.${cancelNote ? ` Reason: ${cancelNote}` : ''}`,
            `/quests/${signup.questId}`,
        );
    }

    // Notify promoted waitlist player
    const nextWaitlist = waitlist[0];
    if (nextWaitlist) {
        const promotedUserId = charUserMap[(nextWaitlist as any).characterId];
        if (promotedUserId) {
            await createNotification(
                promotedUserId,
                'QUEST_WAITLIST_PROMOTED',
                'Spot available!',
                `A spot opened up in "${(signup as any).quest?.title}". Your DM must confirm your place — this will expire in ${PENDING_CONFIRMATION_EXPIRY_HOURS} hours.`,
                `/quests/${signup.questId}`,
            );
        }
    }
}

export async function confirmWaitlistPromotion(signupId: string, actorId: string) {
    const signup = await db.questSignup.findUnique({
        where:   { id: signupId },
        include: { quest: { select: { title: true } } },
    });
    if (!signup) throw new NotFoundError('QuestSignup', signupId);
    if (signup.status !== 'PENDING_CONFIRMATION')
        throw new ValidationError('Signup is not pending confirmation.');

    return db.$transaction(async (tx) => {
        const updated = await tx.questSignup.update({
            where: { id: signupId },
            data:  { status: 'CONFIRMED', promotedAt: null },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Quest',
            resourceId:  signup.questId,
            after:       { signupId, status: 'CONFIRMED' },
        });

        return updated;
    });
}

// Called periodically (every 15 min from Discord bot) to expire stale PENDING_CONFIRMATION signups
export async function expireStalePromotions(): Promise<void> {
    const cutoff = new Date(Date.now() - PENDING_CONFIRMATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const stale = await db.questSignup.findMany({
        where:   { status: 'PENDING_CONFIRMATION' as any, promotedAt: { lte: cutoff } },
        include: { quest: { select: { title: true } } },
    });

    for (const signup of stale) {
        // Load next waitlist for this quest
        const nextWaitlist = await db.questSignup.findFirst({
            where:   { questId: signup.questId, status: 'WAITLIST' as any },
            orderBy: { signedUpAt: 'asc' },
        });

        // Look up character userIds separately (cross-schema — no direct relation)
        const expiredChar  = await db.character.findUnique({ where: { id: signup.characterId }, select: { userId: true } });
        const nextChar     = nextWaitlist ? await db.character.findUnique({ where: { id: (nextWaitlist as any).characterId }, select: { userId: true } }) : null;

        await db.$transaction(async (tx) => {
            // Cancel the expired PENDING_CONFIRMATION
            await tx.questSignup.update({
                where: { id: signup.id },
                data:  { status: 'CANCELLED', cancelNote: 'Waitlist confirmation expired after 8 hours' },
            });

            // Promote next waitlist entry
            if (nextWaitlist) {
                await tx.questSignup.update({
                    where: { id: nextWaitlist.id },
                    data:  { status: 'PENDING_CONFIRMATION', promotedAt: new Date() },
                });
            }
        });

        // Notify expired player
        const expiredUserId = expiredChar?.userId;
        if (expiredUserId) {
            await createNotification(
                expiredUserId,
                'QUEST_WAITLIST_EXPIRED',
                'Waitlist spot expired',
                `Your promoted spot in "${(signup as any).quest?.title}" expired after ${PENDING_CONFIRMATION_EXPIRY_HOURS} hours without DM confirmation.`,
                `/quests/${signup.questId}`,
            );
        }

        // Notify next promoted player
        if (nextWaitlist) {
            const nextUserId = nextChar?.userId;
            if (nextUserId) {
                await createNotification(
                    nextUserId,
                    'QUEST_WAITLIST_PROMOTED',
                    'Spot available!',
                    `A spot opened up in "${(signup as any).quest?.title}". Your DM must confirm your place — this will expire in ${PENDING_CONFIRMATION_EXPIRY_HOURS} hours.`,
                    `/quests/${signup.questId}`,
                );
            }
        }
    }
}