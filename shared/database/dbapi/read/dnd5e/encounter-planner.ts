// shared/database/dbapi/read/dnd5e/encounter-planner.ts
import { db } from '../../../index.ts';
import type { EncounterPlannerConfig } from './eplanner-calc.ts';
import { EPLANNER_DEFAULTS } from './eplanner-defaults.ts';

export type EncounterPlannerTables = EncounterPlannerConfig & {
    /** Row ids for admin editing (empty for default-backed values). */
    crToXpRows: { id: string; cr: number; xp: number }[];
    levelThresholdRows: { id: string; level: number; low: number; moderate: number; high: number }[];
    multiplierRows: { id: string; minCount: number; multiplier: number }[];
    configId: string | null;
};

// Merged config for the calculator: DB rows when present, defaults otherwise.
export async function getEncounterConfig(gameSystemId: string): Promise<EncounterPlannerTables> {
    const [xpRows, thresholdRows, multiplierRows, configRow] = await Promise.all([
        db.dnd5eEncounterXp.findMany({ where: { gameSystemId }, orderBy: { cr: 'asc' } }),
        db.dnd5eEncounterLevelThreshold.findMany({ where: { gameSystemId }, orderBy: { level: 'asc' } }),
        db.dnd5eEncounterMultiplier.findMany({ where: { gameSystemId }, orderBy: { minCount: 'asc' } }),
        db.dnd5eEncounterConfig.findUnique({ where: { gameSystemId } }),
    ]);

    return {
        crToXp: xpRows.length ? xpRows.map(r => ({ cr: r.cr, xp: r.xp })) : EPLANNER_DEFAULTS.crToXp,
        levelThresholds: thresholdRows.length
            ? thresholdRows.map(r => ({ level: r.level, low: r.low, moderate: r.moderate, high: r.high }))
            : EPLANNER_DEFAULTS.levelThresholds,
        multipliers: multiplierRows.length
            ? multiplierRows.map(r => ({ minCount: r.minCount, multiplier: r.multiplier }))
            : EPLANNER_DEFAULTS.multipliers,
        moderateRatio:          configRow?.moderateRatio          ?? EPLANNER_DEFAULTS.moderateRatio,
        highRatio:              configRow?.highRatio              ?? EPLANNER_DEFAULTS.highRatio,
        extremeRatio:           configRow?.extremeRatio           ?? EPLANNER_DEFAULTS.extremeRatio,
        rewardGpRate:           configRow?.rewardGpRate           ?? EPLANNER_DEFAULTS.rewardGpRate,
        adventureDayMultiplier: configRow?.adventureDayMultiplier ?? EPLANNER_DEFAULTS.adventureDayMultiplier,
        crToXpRows:         xpRows.map(r => ({ id: r.id, cr: r.cr, xp: r.xp })),
        levelThresholdRows: thresholdRows.map(r => ({ id: r.id, level: r.level, low: r.low, moderate: r.moderate, high: r.high })),
        multiplierRows:     multiplierRows.map(r => ({ id: r.id, minCount: r.minCount, multiplier: r.multiplier })),
        configId:           configRow?.id ?? null,
    };
}
