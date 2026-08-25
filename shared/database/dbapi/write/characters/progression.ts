// shared/database/dbapi/write/characters/progression.ts
// The single path that decides a character's level change.
//
// Two level concepts, never conflated:
//   Character.level       approved power — always the sum of allocated class levels.
//                         Written on create, on approval, and by admin class edits.
//                         Every gate (quest signup, marketplace, regions) reads this.
//   Character.earnedLevel what the progression totals entitle them to. Written ONLY here.
//
// When the two diverge the character is parked in LEVEL_UP_PENDING or
// LEVEL_DOWN_PENDING until they submit an allocation and it is approved.
import { createNotification } from '../notifications/notifications.ts';

export type ProgressionMode = 'XP' | 'MILESTONE';

export type ThresholdRow = {
    id?: string;
    label?: string;
    xpRequired: number;
    milestoneRequired: number;
    sortOrder?: number;
    description?: string | null;
};

export type ProgressionTotals = { totalXp: number; totalMilestones: number };

/**
 * Effective ladder for a character: game-system thresholds with sparse
 * home-world overrides layered on. Global characters (no worldId) get the
 * pure system ladder. Quest world is never consulted.
 */
export async function getEffectiveThresholds(
    dbClient: any,
    gameSystemId: string,
    worldId?: string | null,
): Promise<ThresholdRow[]> {
    const system = await dbClient.progressionThreshold.findMany({
        where:   { gameSystemId },
        orderBy: [{ sortOrder: 'asc' }, { xpRequired: 'asc' }],
        select:  {
            id: true, label: true, xpRequired: true, milestoneRequired: true,
            sortOrder: true, description: true,
        },
    });
    if (!worldId || !system.length) return system;

    const overrides: Array<{
        thresholdId: string;
        xpRequired: number | null;
        milestoneRequired: number | null;
    }> = await dbClient.worldProgressionOverride.findMany({
        where:  { worldId },
        select: { thresholdId: true, xpRequired: true, milestoneRequired: true },
    });
    if (!overrides.length) return system;

    const byId = new Map(overrides.map(o => [o.thresholdId, o]));
    return system.map((t: ThresholdRow & { id: string }) => {
        const o = byId.get(t.id);
        if (!o) return t;
        return {
            ...t,
            xpRequired:        o.xpRequired        ?? t.xpRequired,
            milestoneRequired: o.milestoneRequired ?? t.milestoneRequired,
        };
    });
}

/**
 * Level = number of thresholds cleared. Both modes share this shape so the rest
 * of the system never has to branch on progression mode.
 */
export function resolveEarnedLevel(
    mode: ProgressionMode,
    totals: ProgressionTotals,
    thresholds: ThresholdRow[],
): number {
    return mode === 'MILESTONE'
        ? thresholds.filter(t => totals.totalMilestones >= t.milestoneRequired).length
        : thresholds.filter(t => totals.totalXp >= t.xpRequired).length;
}

/**
 * `milestoneRequired` defaults to 0, so a game system that has never had its
 * milestone ladder filled in would read as "every threshold cleared" and jump
 * characters straight to max level. Treat that as unconfigured instead.
 */
export function isLadderConfigured(mode: ProgressionMode, thresholds: ThresholdRow[]): boolean {
    if (!thresholds.length) return false;
    return mode === 'MILESTONE'
        ? thresholds.some(t => t.milestoneRequired > 0)
        : true;
}

/** The running total that drives levelling for a given mode. */
export function progressionTotal(mode: ProgressionMode, totals: ProgressionTotals): number {
    return mode === 'MILESTONE' ? totals.totalMilestones : totals.totalXp;
}

/** The threshold column that drives levelling for a given mode. */
export function thresholdRequirement(mode: ProgressionMode, t: ThresholdRow): number {
    return mode === 'MILESTONE' ? t.milestoneRequired : t.xpRequired;
}

export type ProgressionResult = {
    earnedLevel: number;
    approvedLevel: number;
    changed: 'UP' | 'DOWN' | null;
};

/**
 * Recompute earnedLevel from the character's current totals and park them in the
 * right pending state. Use this when the caller has already mutated totalXp /
 * totalMilestones itself (e.g. token store boosts, which write their own
 * bespoke transaction rows).
 */
export async function reconcileProgression(
    tx: any,
    characterId: string,
    opts: { actorId: string; restUntil?: Date } = { actorId: 'system' },
): Promise<ProgressionResult> {
    const char = await tx.character.findUnique({
        where:  { id: characterId },
        select: {
            id: true, userId: true, gameSystemId: true, worldId: true, progressionMode: true,
            level: true, earnedLevel: true, totalXp: true, totalMilestones: true,
            status: true, statusReason: true,
        },
    });
    if (!char) return { earnedLevel: 0, approvedLevel: 0, changed: null };

    const thresholds = await getEffectiveThresholds(tx, char.gameSystemId, char.worldId);

    const approvedLevel = char.level;
    const earnedLevel   = isLadderConfigured(char.progressionMode, thresholds)
        ? resolveEarnedLevel(char.progressionMode, char, thresholds)
        : char.earnedLevel;

    const data: Record<string, unknown> = {};
    if (earnedLevel !== char.earnedLevel) data.earnedLevel = earnedLevel;
    if (opts.restUntil)                   data.restUntil   = opts.restUntil;

    const alreadyUp   = char.statusReason === 'LEVEL_UP_PENDING';
    const alreadyDown = char.statusReason === 'LEVEL_DOWN_PENDING';
    let changed: 'UP' | 'DOWN' | null = null;

    if (earnedLevel > approvedLevel) {
        changed = 'UP';
        // Guard: do not re-fire while the player already owes us an allocation.
        if (!alreadyUp) {
            data.status          = 'PENDING';
            data.statusReason    = 'LEVEL_UP_PENDING';
            data.statusChangedAt = new Date();
        }
    } else if (earnedLevel < approvedLevel) {
        changed = 'DOWN';
        if (!alreadyDown) {
            data.status          = 'PENDING';
            data.statusReason    = 'LEVEL_DOWN_PENDING';
            data.statusChangedAt = new Date();
        }
    } else if (alreadyUp || alreadyDown) {
        // Totals moved back in line on their own — release the pending state.
        data.status          = opts.restUntil ? 'RESTING'    : 'ACTIVE';
        data.statusReason    = opts.restUntil ? 'QUEST_REST' : null;
        data.statusChangedAt = new Date();
    } else if (opts.restUntil && char.status !== 'PENDING') {
        data.status          = 'RESTING';
        data.statusReason    = 'QUEST_REST';
        data.statusChangedAt = new Date();
    }

    if (Object.keys(data).length) {
        await tx.character.update({ where: { id: characterId }, data });
    }

    // Notify + audit only on a fresh transition, never on a repeat.
    if (changed === 'UP' && !alreadyUp) {
        await createNotification(
            char.userId, 'CHARACTER_LEVEL_UP', 'Level up available!',
            `You have reached level ${earnedLevel}! Go to your character to allocate new levels.`,
            `/characters/${characterId}`,
        );
    } else if (changed === 'DOWN' && !alreadyDown) {
        await tx.characterTransaction.create({
            data: {
                characterId, type: 'STATUS',
                fromValue:  `Level ${approvedLevel}`,
                toValue:    `Level ${earnedLevel}`,
                sourceType: 'ADMIN',
                note:       `Progression change requires level adjustment: ${approvedLevel} → ${earnedLevel}`,
                createdBy:  opts.actorId,
            },
        });
        await createNotification(
            char.userId, 'CHARACTER_LEVEL_DOWN', 'Level adjustment required',
            `Your progression dropped below your allocated levels. Reduce your class levels from ${approvedLevel} to ${earnedLevel}.`,
            `/characters/${characterId}`,
        );
    }

    return { earnedLevel, approvedLevel, changed };
}

export type ProgressionSource = {
    type: 'QUEST' | 'MARKETPLACE' | 'ADMIN' | 'REWARD' | 'SYSTEM';
    id?: string;
    note: string;
};

/**
 * Apply XP and/or milestone deltas, record the transactions, then reconcile the
 * level. This is the entry point for quest results, admin adjustments and
 * reward reversals.
 *
 * XP is always recorded even for MILESTONE characters — it simply does not
 * drive their levelling. That keeps reward code free of mode branching and
 * means switching a character's mode later does not lose history.
 */
export async function applyProgressionChange(
    tx: any,
    opts: {
        characterId: string;
        actorId: string;
        xpDelta?: number;
        milestoneDelta?: number;
        source: ProgressionSource;
        /** Separate note for the milestone row when it differs from the XP row. */
        milestoneNote?: string;
        restUntil?: Date;
    },
): Promise<ProgressionResult> {
    const char = await tx.character.findUnique({
        where:  { id: opts.characterId },
        select: { totalXp: true, totalMilestones: true },
    });
    if (!char) return { earnedLevel: 0, approvedLevel: 0, changed: null };

    const xpDelta        = Math.round(opts.xpDelta ?? 0);
    const milestoneDelta = Math.round(opts.milestoneDelta ?? 0);

    // Totals can never go negative; clamp the delta rather than the result so the
    // recorded transaction matches what actually moved.
    const appliedXp        = Math.max(xpDelta, -char.totalXp);
    const appliedMilestone = Math.max(milestoneDelta, -char.totalMilestones);

    if (appliedXp !== 0 || appliedMilestone !== 0) {
        await tx.character.update({
            where: { id: opts.characterId },
            data: {
                ...(appliedXp        !== 0 && { totalXp:         { increment: appliedXp        } }),
                ...(appliedMilestone !== 0 && { totalMilestones: { increment: appliedMilestone } }),
            },
        });
    }

    if (appliedXp !== 0) {
        await tx.characterTransaction.create({
            data: {
                characterId: opts.characterId,
                type:        'XP',
                delta:       appliedXp,
                fromValue:   String(char.totalXp),
                toValue:     String(char.totalXp + appliedXp),
                sourceType:  opts.source.type,
                sourceId:    opts.source.id ?? null,
                note:        opts.source.note,
                createdBy:   opts.actorId,
            },
        });
    }

    if (appliedMilestone !== 0) {
        await tx.characterTransaction.create({
            data: {
                characterId: opts.characterId,
                type:        'MILESTONE',
                delta:       appliedMilestone,
                fromValue:   String(char.totalMilestones),
                toValue:     String(char.totalMilestones + appliedMilestone),
                sourceType:  opts.source.type,
                sourceId:    opts.source.id ?? null,
                note:        opts.milestoneNote ?? opts.source.note,
                createdBy:   opts.actorId,
            },
        });
    }

    return reconcileProgression(tx, opts.characterId, {
        actorId:   opts.actorId,
        restUntil: opts.restUntil,
    });
}

/**
 * Move an existing character between XP and milestone progression.
 *
 * The target mode reads a different total, which is normally zero, so by default
 * we seed it to the threshold for the character's current earned level. Without
 * seeding the character would immediately drop to level 0 and be flagged for a
 * level-down.
 */
export async function setCharacterProgressionMode(
    dbClient: any,
    characterId: string,
    mode: ProgressionMode,
    actorId: string,
    seedTotal = true,
) {
    const char = await dbClient.character.findUnique({
        where:  { id: characterId },
        select: {
            progressionMode: true, gameSystemId: true, worldId: true,
            earnedLevel: true, totalXp: true, totalMilestones: true,
        },
    });
    if (!char) return null;
    if (char.progressionMode === mode) return char;

    const thresholds = await getEffectiveThresholds(dbClient, char.gameSystemId, char.worldId);

    const data: Record<string, unknown> = { progressionMode: mode };
    if (seedTotal && char.earnedLevel > 0 && thresholds.length >= char.earnedLevel) {
        const target  = thresholds[char.earnedLevel - 1];
        const seeded  = thresholdRequirement(mode, target);
        const current = progressionTotal(mode, char);
        if (seeded > current) {
            const field = mode === 'MILESTONE' ? 'totalMilestones' : 'totalXp';
            data[field] = seeded;
            await dbClient.characterTransaction.create({
                data: {
                    characterId,
                    type:       mode === 'MILESTONE' ? 'MILESTONE' : 'XP',
                    delta:      seeded - current,
                    fromValue:  String(current),
                    toValue:    String(seeded),
                    sourceType: 'ADMIN',
                    note:       `Progression mode changed to ${mode} — total seeded to hold level ${char.earnedLevel}`,
                    createdBy:  actorId,
                },
            });
        }
    }

    await dbClient.character.update({ where: { id: characterId }, data });
    await reconcileProgression(dbClient, characterId, { actorId });
    return dbClient.character.findUnique({ where: { id: characterId } });
}

/**
 * Resolve the progression mode a new character should snapshot:
 * world override first, then the game system default.
 */
export async function resolveProgressionMode(
    dbClient: any,
    gameSystemId: string,
    worldId?: string | null,
): Promise<ProgressionMode> {
    if (worldId) {
        const world = await dbClient.world.findUnique({
            where:  { id: worldId },
            select: { progressionMode: true },
        });
        if (world?.progressionMode) return world.progressionMode;
    }
    const system = await dbClient.gameSystem.findUnique({
        where:  { id: gameSystemId },
        select: { defaultProgressionMode: true },
    });
    return system?.defaultProgressionMode ?? 'XP';
}
