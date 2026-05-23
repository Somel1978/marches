// shared/database/dbapi/read/rewards/get-achievements.ts
import { db } from '../../../index.ts';

export async function getAllAchievements(activeOnly = false) {
    return db.achievement.findMany({
        where:   activeOnly ? { isActive: true } : {},
        orderBy: { name: 'asc' },
    });
}

export async function getCharacterAchievements(characterId: string) {
    const grants = await db.characterAchievement.findMany({ where: { characterId }, orderBy: { grantedAt: 'desc' } });
    const ids    = grants.map(g => g.achievementId);
    const defs   = ids.length ? await db.achievement.findMany({ where: { id: { in: ids } } }) : [];
    const defMap = Object.fromEntries(defs.map(d => [d.id, d]));
    return grants.map(g => ({ ...g, achievement: defMap[g.achievementId] ?? null }));
}
