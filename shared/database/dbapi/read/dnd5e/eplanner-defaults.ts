// shared/database/dbapi/read/dnd5e/eplanner-defaults.ts
//
// Default encounter planner values (2024 DMG), used to seed the dnd5e
// encounter tables and by the admin "reset to defaults" action.
// Pure data — no DB imports.

import type { EncounterPlannerConfig } from './eplanner-calc.ts';

const CR_TO_XP: [number, number][] = [
    [0, 10], [0.125, 25], [0.25, 50], [0.5, 100],
    [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800],
    [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900],
    [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000],
    [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000],
    [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000],
    [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
    [31, 180000], [32, 200000], [33, 220000], [34, 250000], [35, 275000],
    [36, 300000], [37, 325000], [38, 350000], [39, 375000], [40, 425000],
    [41, 475000], [42, 525000], [43, 575000], [44, 625000], [45, 675000],
];

const LEVEL_THRESHOLDS: [number, number, number, number][] = [
    // level, low, moderate, high
    [1, 25, 50, 75],
    [2, 50, 100, 150],
    [3, 75, 150, 225],
    [4, 125, 250, 375],
    [5, 250, 500, 750],
    [6, 300, 600, 900],
    [7, 350, 750, 1100],
    [8, 450, 900, 1400],
    [9, 550, 1100, 1600],
    [10, 600, 1200, 1900],
    [11, 800, 1600, 2400],
    [12, 1000, 2000, 3000],
    [13, 1100, 2200, 3400],
    [14, 1250, 2500, 3800],
    [15, 1400, 2800, 4300],
    [16, 1600, 3200, 4800],
    [17, 2000, 3900, 5900],
    [18, 2100, 4200, 6300],
    [19, 2400, 4900, 7300],
    [20, 2800, 5700, 8500],
];

const MULTIPLIERS: [number, number][] = [
    [1, 1], [2, 1.1], [4, 1.2], [7, 1.3], [11, 1.4],
];

export const EPLANNER_DEFAULTS: EncounterPlannerConfig = {
    crToXp: CR_TO_XP.map(([cr, xp]) => ({ cr, xp })),
    levelThresholds: LEVEL_THRESHOLDS.map(([level, low, moderate, high]) => ({ level, low, moderate, high })),
    multipliers: MULTIPLIERS.map(([minCount, multiplier]) => ({ minCount, multiplier })),
    moderateRatio: 0.3,
    highRatio: 0.7,
    extremeRatio: 1.2,
    rewardGpRate: 0.2,
    adventureDayMultiplier: 4,
};
