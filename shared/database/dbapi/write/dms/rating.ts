// shared/database/dbapi/write/dms/rating.ts
import { db } from '../../../index.ts';
import { ValidationError, ConflictError } from '@core/errors';

export async function submitDMRating(
    questId:     string,
    userId:      string,
    rating:      number,
    comment?:    string,
) {
    if (rating < 1 || rating > 5) throw new ValidationError('Rating must be between 1 and 5.');

    // Quest must be COMPLETED
    const quest = await db.quest.findUnique({ where: { id: questId }, select: { status: true, dmProfileId: true } });
    if (!quest)                       throw new ValidationError('Quest not found.');
    if (quest.status !== 'COMPLETED') throw new ValidationError('You can only rate completed quests.');

    // Block DM from rating their own quest
    const dmProfile = await db.dMProfile.findFirst({ where: { userId } });
    if (dmProfile && quest.dmProfileId === dmProfile.id) {
        throw new ValidationError('You cannot rate your own quest.');
    }

    // User must have participated (signed up as CONFIRMED)
    // Check user has a confirmed character in this quest
    const userChars = await db.character.findMany({ where: { userId }, select: { id: true } });
    const userCharIds = userChars.map(c => c.id);
    const signup = await db.questSignup.findFirst({
        where: {
            questId,
            status:      'CONFIRMED',
            characterId: { in: userCharIds },
        },
    });
    if (!signup) throw new ValidationError('You did not participate in this quest.');

    // One rating per user per quest
    const existing = await db.dMRating.findUnique({
        where: { dmProfileId_questId_userId: { dmProfileId: quest.dmProfileId, questId, userId } },
    });
    if (existing) throw new ConflictError('You have already rated this DM for this quest.');

    return db.dMRating.create({
        data: { dmProfileId: quest.dmProfileId, userId, questId, rating, comment: comment ?? null },
    });
}

export async function getDMRatingForQuest(questId: string, userId: string) {
    const quest = await db.quest.findUnique({ where: { id: questId }, select: { dmProfileId: true } });
    if (!quest) return null;
    return db.dMRating.findUnique({
        where: { dmProfileId_questId_userId: { dmProfileId: quest.dmProfileId, questId, userId } },
    });
}