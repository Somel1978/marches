// shared/database/dbapi/write/quests/signup.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError, ConflictError } from '@core/errors';

export async function signupForQuest(questId: string, characterId: string, actorId: string) {
    const quest = await db.quest.findUnique({
        where:   { id: questId },
        include: { signups: { where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } } } },
    });
    if (!quest)                      throw new NotFoundError('Quest', questId);
    if (quest.status !== 'PUBLISHED') throw new ValidationError('Quest is not open for signups.');

    const existing = await db.questSignup.findUnique({
        where: { questId_characterId: { questId, characterId } },
    });
    if (existing && existing.status !== 'CANCELLED')
        throw new ConflictError('Character is already signed up for this quest.');

    // Check character level requirement
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundError('Character', characterId);

    const level = character.level ?? 0;
    if (level < quest.minLevel || level > quest.maxLevel)
        throw new ValidationError(`Character level ${level} is outside the quest range (${quest.minLevel}–${quest.maxLevel}).`);

    const confirmedCount = quest.signups.length;
    const status = confirmedCount < quest.maxCapacity ? 'CONFIRMED' : 'WAITLIST';

    return db.$transaction(async (tx) => {
        const signup = existing
            ? await tx.questSignup.update({ where: { id: existing.id }, data: { status: status as any, cancelNote: null } })
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
        include: { quest: { include: { signups: { where: { status: 'WAITLIST' as any }, orderBy: { signedUpAt: 'asc' } } } } },
    });
    if (!signup) throw new NotFoundError('QuestSignup', signupId);

    return db.$transaction(async (tx) => {
        await tx.questSignup.update({
            where: { id: signupId },
            data:  { status: 'CANCELLED', cancelNote: cancelNote ?? null },
        });

        // Auto-promote first waitlist entry to PENDING_CONFIRMATION
        const nextWaitlist = signup.quest.signups[0];
        if (nextWaitlist) {
            await tx.questSignup.update({
                where: { id: nextWaitlist.id },
                data:  { status: 'PENDING_CONFIRMATION' },
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
}

export async function confirmWaitlistPromotion(signupId: string, actorId: string) {
    const signup = await db.questSignup.findUnique({ where: { id: signupId } });
    if (!signup) throw new NotFoundError('QuestSignup', signupId);
    if (signup.status !== 'PENDING_CONFIRMATION')
        throw new ValidationError('Signup is not pending confirmation.');

    return db.$transaction(async (tx) => {
        const updated = await tx.questSignup.update({
            where: { id: signupId },
            data:  { status: 'CONFIRMED' },
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