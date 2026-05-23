// shared/database/dbapi/write/rewards/achievements.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ConflictError } from '@core/errors';

export async function createAchievement(input: { name: string; description?: string; icon?: string }, actorId: string) {
    const achievement = await db.achievement.create({ data: { ...input, createdBy: actorId } });
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'Achievement', resourceId: achievement.id, after: achievement });
    return achievement;
}

export async function updateAchievement(id: string, input: { name?: string; description?: string; icon?: string; isActive?: boolean }, actorId: string) {
    const achievement = await db.achievement.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'Achievement', resourceId: id, after: input });
    return achievement;
}

export async function grantAchievement(characterId: string, achievementId: string, note: string | undefined, actorId: string) {
    const existing = await db.characterAchievement.findUnique({ where: { characterId_achievementId: { characterId, achievementId } } });
    if (existing) throw new ConflictError('Character already has this achievement.');
    const grant = await db.characterAchievement.create({ data: { characterId, achievementId, grantedBy: actorId, note: note ?? null } });
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'CharacterAchievement', resourceId: grant.id, after: { characterId, achievementId } });
    return grant;
}

export async function revokeAchievement(characterId: string, achievementId: string, actorId: string) {
    const existing = await db.characterAchievement.findUnique({ where: { characterId_achievementId: { characterId, achievementId } } });
    if (!existing) throw new NotFoundError('CharacterAchievement', `${characterId}-${achievementId}`);
    await db.characterAchievement.delete({ where: { characterId_achievementId: { characterId, achievementId } } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'CharacterAchievement', resourceId: existing.id, before: existing });
}
