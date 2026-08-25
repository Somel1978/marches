// shared/database/dbapi/write/world/progression-overrides.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { reconcileProgression } from '../characters/progression.ts';

export type WorldOverrideInput = {
    thresholdId: string;
    /** null / undefined = inherit system value (no override for this column) */
    xpRequired?: number | null;
    milestoneRequired?: number | null;
};

/**
 * Replace-set sparse world ladder overrides, then re-resolve earnedLevel for
 * every character whose home world is this world.
 *
 * Rows with both columns null/cleared are deleted. Global characters are not
 * touched — they always use the pure game-system ladder.
 */
export async function upsertWorldProgressionOverrides(
    worldId: string,
    rows: WorldOverrideInput[],
    actorId: string,
): Promise<{ overrideCount: number; charactersReconciled: number; pendingChanges: number }> {
    const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true, name: true } });
    if (!world) throw new NotFoundError('World', worldId);

    function parseOptionalInt(v: number | null | undefined): number | null {
        if (v == null) return null;
        const n = Math.round(Number(v));
        if (Number.isNaN(n)) throw new ValidationError('Override values must be numbers or empty.');
        return Math.max(0, n);
    }

    // Normalise: keep only rows that actually override something.
    const next = rows
        .map(r => ({
            thresholdId:       r.thresholdId,
            xpRequired:        parseOptionalInt(r.xpRequired),
            milestoneRequired: parseOptionalInt(r.milestoneRequired),
        }))
        .filter(r => !!r.thresholdId && (r.xpRequired !== null || r.milestoneRequired !== null));

    const thresholdIds = [...new Set(next.map(r => r.thresholdId))];
    if (thresholdIds.length) {
        const existing = await db.progressionThreshold.findMany({
            where:  { id: { in: thresholdIds } },
            select: { id: true },
        });
        if (existing.length !== thresholdIds.length) {
            throw new ValidationError('One or more threshold IDs are invalid.');
        }
    }

    const before = await db.worldProgressionOverride.findMany({ where: { worldId } });

    const result = await db.$transaction(async (tx) => {
        // Full replace-set for this world.
        await tx.worldProgressionOverride.deleteMany({ where: { worldId } });
        if (next.length) {
            await tx.worldProgressionOverride.createMany({
                data: next.map(r => ({
                    worldId,
                    thresholdId:       r.thresholdId,
                    xpRequired:        r.xpRequired,
                    milestoneRequired: r.milestoneRequired,
                })),
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'World',
            resourceId:  worldId,
            before:      { progressionOverrides: before },
            after:       { progressionOverrides: next },
            metadata:    { kind: 'progression_overrides' },
        });

        const homeChars = await tx.character.findMany({
            where:  { worldId },
            select: { id: true },
        });

        let pendingChanges = 0;
        for (const c of homeChars) {
            const prog = await reconcileProgression(tx, c.id, { actorId });
            if (prog.changed) pendingChanges++;
        }

        return {
            overrideCount:         next.length,
            charactersReconciled:  homeChars.length,
            pendingChanges,
        };
    });

    return result;
}

export async function getWorldProgressionOverrides(worldId: string) {
    return db.worldProgressionOverride.findMany({
        where: { worldId },
        select: {
            id: true, thresholdId: true,
            xpRequired: true, milestoneRequired: true,
            updatedAt: true,
        },
    });
}

/** Home-world character count — used by the UI save warning. */
export async function countWorldHomeCharacters(worldId: string) {
    return db.character.count({ where: { worldId } });
}
