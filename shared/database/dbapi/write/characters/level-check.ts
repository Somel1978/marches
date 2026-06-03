// shared/database/dbapi/write/characters/level-check.ts
// Shared helper: check for level-up or level-down after XP change and set appropriate status
import { db } from '../../../index.ts';
import { createNotification } from '../notifications/notifications.ts';

export async function checkLevelChange(
    tx: any,
    characterId: string,
    userId: string,
    gameSystemId: string,
    prevXp: number,
    newXp: number,
    currentAllocatedLevels: number,
    actorId: string,
) {
    const thresholds = await tx.progressionThreshold.findMany({
        where:   { gameSystemId },
        orderBy: { xpRequired: 'asc' },
    });
    if (!thresholds.length) return;

    const prevEarned = thresholds.filter((t: any) => prevXp >= t.xpRequired).length;
    const newEarned  = thresholds.filter((t: any) => newXp  >= t.xpRequired).length;

    if (newEarned > currentAllocatedLevels) {
        // Level-up: unallocated levels available — only if not already pending
        const current = await tx.character.findUnique({ where: { id: characterId }, select: { status: true, statusReason: true } });
        if (current?.statusReason !== 'LEVEL_UP_PENDING') {
        // Level-up: new threshold crossed — write level immediately (player will allocate classes)
        await tx.character.update({
            where: { id: characterId },
            data:  { level: newEarned, status: 'PENDING', statusReason: 'LEVEL_UP_PENDING', statusChangedAt: new Date() },
        });
        await createNotification(
            userId, 'CHARACTER_LEVEL_UP', 'Level up available!',
            `You have reached level ${newEarned}! Go to your character to allocate new levels.`,
            `/characters/${characterId}`,
        );
        }
    } else if (newEarned < currentAllocatedLevels) {
        // Level-down: dropped below allocated levels — write new level immediately
        await tx.character.update({
            where: { id: characterId },
            data:  { level: newEarned, status: 'PENDING', statusReason: 'LEVEL_DOWN_PENDING', statusChangedAt: new Date() },
        });
        await tx.characterTransaction.create({
            data: {
                characterId, type: 'STATUS',
                fromValue: `Level ${currentAllocatedLevels}`,
                toValue:   `Level ${newEarned}`,
                sourceType: 'ADMIN',
                note: `XP change requires level adjustment: ${currentAllocatedLevels} → ${newEarned}`,
                createdBy: actorId,
            },
        });
        await createNotification(
            userId, 'CHARACTER_LEVEL_DOWN', 'Level adjustment required',
            `Your XP changed to ${newXp}. You need to adjust your class levels from ${currentAllocatedLevels} to ${newEarned}.`,
            `/characters/${characterId}`,
        );
    }
}