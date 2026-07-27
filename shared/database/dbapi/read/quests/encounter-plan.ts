// shared/database/dbapi/read/quests/encounter-plan.ts
import { db } from '../../../index.ts';
import { calculateMission, type MissionInput } from '../dnd5e/eplanner-calc.ts';
import { getEncounterConfig } from '../dnd5e/encounter-planner.ts';

/** Persisted on Quest.encounterPlan — compact monster groups, no UI ids. */
export type QuestEncounterPlan = {
    level: number;
    partySize: number;
    /** Decimal adjustment, e.g. 0.1 = +10%. */
    adjustment: number;
    lairXp: number;
    encounters: { monsters: { cr: number; count: number }[] }[];
};

export function parseQuestEncounterPlan(raw: unknown): QuestEncounterPlan | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o.encounters)) return null;

    const encounters = o.encounters
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => ({
            monsters: (Array.isArray(e.monsters) ? e.monsters : [])
                .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
                .map((m) => ({ cr: Number(m.cr), count: Math.max(1, Math.round(Number(m.count) || 1)) }))
                .filter((m) => Number.isFinite(m.cr) && m.cr >= 0),
        }));

    return {
        level:      Math.min(20, Math.max(1, Math.round(Number(o.level) || 1))),
        partySize:  Math.max(1, Math.round(Number(o.partySize) || 1)),
        adjustment: Number(o.adjustment) || 0,
        lairXp:     Math.max(0, Math.round(Number(o.lairXp) || 0)),
        encounters,
    };
}

export function planToMissionInput(plan: QuestEncounterPlan): MissionInput {
    return {
        level:      plan.level,
        partySize:  plan.partySize,
        adjustment: plan.adjustment,
        lairXp:     plan.lairXp,
        encounters: plan.encounters.map((e) => ({
            monsterCrs: e.monsters.flatMap((m) => Array(m.count).fill(m.cr)),
        })),
    };
}

async function dnd5eGameSystemId(): Promise<string | null> {
    const gs = await db.gameSystem.findUnique({ where: { slug: 'dnd5e' }, select: { id: true } });
    return gs?.id ?? null;
}

/** Client-safe config subset for encounter planner UI. */
export async function loadEncounterPlannerClientConfig() {
    const gsId = await dnd5eGameSystemId();
    if (!gsId) return null;
    const cfg = await getEncounterConfig(gsId);
    return {
        crToXp:                 cfg.crToXp,
        levelThresholds:        cfg.levelThresholds,
        multipliers:            cfg.multipliers,
        moderateRatio:          cfg.moderateRatio,
        highRatio:              cfg.highRatio,
        extremeRatio:           cfg.extremeRatio,
        rewardGpRate:           cfg.rewardGpRate,
        adventureDayMultiplier: cfg.adventureDayMultiplier,
    };
}

/** Parse JSON from form, recalculate missionXp from dnd5e encounter tables. */
export async function resolveQuestMissionXp(
    encounterPlanJson: string | null | undefined,
    fallbackMissionXp = 0,
): Promise<{ missionXp: number; encounterPlan: QuestEncounterPlan | null }> {
    if (!encounterPlanJson?.trim()) {
        return { missionXp: Math.max(0, Math.round(fallbackMissionXp)), encounterPlan: null };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(encounterPlanJson);
    } catch {
        return { missionXp: Math.max(0, Math.round(fallbackMissionXp)), encounterPlan: null };
    }

    const plan = parseQuestEncounterPlan(parsed);
    if (!plan) {
        return { missionXp: Math.max(0, Math.round(fallbackMissionXp)), encounterPlan: null };
    }

    const gsId = await dnd5eGameSystemId();
    if (!gsId) {
        return { missionXp: Math.max(0, Math.round(fallbackMissionXp)), encounterPlan: plan };
    }

    const config = await getEncounterConfig(gsId);
    const result = calculateMission(planToMissionInput(plan), config);
    return { missionXp: result.totalXp, encounterPlan: plan };
}
