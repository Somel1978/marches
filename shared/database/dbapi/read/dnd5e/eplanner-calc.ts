// shared/database/dbapi/read/dnd5e/eplanner-calc.ts
//
// Pure encounter planner calculation — no DB imports, safe to run in the
// browser (exported as '@core/database/eplanner-calc'). Config comes from the
// dnd5e encounter tables via getEncounterConfig() server-side.

export type EncounterPlannerConfig = {
    crToXp: { cr: number; xp: number }[];
    levelThresholds: { level: number; low: number; moderate: number; high: number }[];
    multipliers: { minCount: number; multiplier: number }[];
    moderateRatio: number;
    highRatio: number;
    extremeRatio: number;
    rewardGpRate: number;
    adventureDayMultiplier: number;
};

export type DifficultyTier = 'Low' | 'Moderate' | 'High' | 'Extreme';

export type EncounterInput = {
    /** Challenge ratings, one entry per monster. */
    monsterCrs: number[];
};

export type MissionInput = {
    level: number;
    partySize: number;
    /** Decimal adjustment, e.g. 0.1 = +10%. */
    adjustment: number;
    lairXp: number;
    encounters: EncounterInput[];
};

export type EncounterBreakdown = {
    baseXp: number;
    multiplier: number;
    adjustedXp: number;
    /** AXP relative to the party's High budget for one encounter. */
    difficultyRatio: number;
    tier: DifficultyTier;
};

export type MissionResult = {
    encounters: EncounterBreakdown[];
    adventureDayXp: number;
    totalXp: number;
    /** floor(totalXp / partySize) */
    rewardXpPerPlayer: number;
    rewardGp: number;
    missionDifficultyRatio: number;
    missionTier: DifficultyTier;
};

function crXp(config: EncounterPlannerConfig, cr: number): number {
    return config.crToXp.find((r) => r.cr === cr)?.xp ?? 0;
}

function thresholdsForLevel(config: EncounterPlannerConfig, level: number) {
    const sorted = [...config.levelThresholds].sort((a, b) => a.level - b.level);
    return (
        sorted.find((t) => t.level === level) ??
        sorted.filter((t) => t.level < level).at(-1) ??
        sorted[0] ??
        { level, low: 0, moderate: 0, high: 0 }
    );
}

/** Approximate lookup: highest minCount ≤ monster count wins. */
export function monsterCountMultiplier(config: EncounterPlannerConfig, count: number): number {
    const eligible = config.multipliers
        .filter((m) => m.minCount <= Math.max(1, count))
        .sort((a, b) => b.minCount - a.minCount);
    return eligible[0]?.multiplier ?? 1;
}

export function calculateMission(input: MissionInput, config: EncounterPlannerConfig): MissionResult {
    const level = Math.min(20, Math.max(1, Math.round(input.level || 1)));
    const partySize = Math.max(1, Math.round(input.partySize || 1));
    const adjustment = input.adjustment || 0;
    const lairXp = Math.max(0, input.lairXp || 0);

    const th = thresholdsForLevel(config, level);
    const highBudget = th.high * partySize;

    const encounters: EncounterBreakdown[] = input.encounters.map((enc) => {
        const crs = enc.monsterCrs;
        const baseXp = crs.reduce((sum, cr) => sum + crXp(config, cr), 0);
        const multiplier = monsterCountMultiplier(config, crs.length);
        const adjustedXp = Math.round(baseXp * multiplier);

        let tier: DifficultyTier;
        if (adjustedXp <= th.low * partySize) tier = 'Low';
        else if (adjustedXp <= th.moderate * partySize) tier = 'Moderate';
        else if (adjustedXp <= highBudget) tier = 'High';
        else tier = 'Extreme';

        return {
            baseXp,
            multiplier,
            adjustedXp,
            difficultyRatio: highBudget > 0 ? adjustedXp / highBudget : 0,
            tier,
        };
    });

    const encounterXpSum = encounters.reduce((sum, e) => sum + e.adjustedXp, 0);
    const totalXp = Math.round((encounterXpSum + lairXp) * (1 + adjustment));
    const adventureDayXp = Math.round(th.high * config.adventureDayMultiplier * partySize);
    const missionDifficultyRatio = adventureDayXp > 0 ? totalXp / adventureDayXp : 0;
    const rewardXpPerPlayer = Math.floor(totalXp / partySize);

    let missionTier: DifficultyTier;
    if (missionDifficultyRatio > config.extremeRatio) missionTier = 'Extreme';
    else if (missionDifficultyRatio > config.highRatio) missionTier = 'High';
    else if (missionDifficultyRatio > config.moderateRatio) missionTier = 'Moderate';
    else missionTier = 'Low';

    return {
        encounters,
        adventureDayXp,
        totalXp,
        rewardXpPerPlayer,
        rewardGp: Math.round(rewardXpPerPlayer * config.rewardGpRate),
        missionDifficultyRatio,
        missionTier,
    };
}
