// apps/frontend/src/routes/(protected)/dm/quests/_planner/planner.ts
import type { MissionInput } from '@core/database/eplanner-calc';
import type { PlannerState, QuestEncounterPlan } from './types.ts';

export function defaultPlannerState(opts?: {
	partySize?: number;
	level?: number;
}): PlannerState {
	return {
		level:      opts?.level ?? 5,
		partySize:  opts?.partySize ?? 4,
		adjustPct:  0,
		lairXp:     0,
		encounters: [{ id: 1, monsters: [] }],
		nextId:     2,
	};
}

export function planFromStored(stored: QuestEncounterPlan | null | undefined, opts?: {
	partySize?: number;
	level?: number;
}): PlannerState {
	if (!stored) return defaultPlannerState(opts);

	let nextId = 1;
	const encounters = stored.encounters.map((e) => ({
		id:       nextId++,
		monsters: e.monsters.map((m) => ({ cr: m.cr, count: m.count })),
	}));

	return {
		level:      stored.level,
		partySize:  stored.partySize,
		adjustPct:  Math.round(stored.adjustment * 100),
		lairXp:     stored.lairXp,
		encounters: encounters.length ? encounters : [{ id: nextId++, monsters: [] }],
		nextId,
	};
}

export function storedFromPlanner(state: PlannerState): QuestEncounterPlan {
	return {
		level:      state.level,
		partySize:  state.partySize,
		adjustment: state.adjustPct / 100,
		lairXp:     state.lairXp,
		encounters: state.encounters.map((e) => ({
			monsters: e.monsters.map((m) => ({ cr: m.cr, count: m.count })),
		})),
	};
}

export function missionInputFromPlanner(state: PlannerState): MissionInput {
	const plan = storedFromPlanner(state);
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

export function parseStoredPlan(raw: unknown): QuestEncounterPlan | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	if (!Array.isArray(o.encounters)) return null;
	return {
		level:      Number(o.level) || 1,
		partySize:  Number(o.partySize) || 1,
		adjustment: Number(o.adjustment) || 0,
		lairXp:     Number(o.lairXp) || 0,
		encounters: (o.encounters as any[]).map((e) => ({
			monsters: (e.monsters ?? []).map((m: any) => ({ cr: Number(m.cr), count: Number(m.count) || 1 })),
		})),
	};
}
