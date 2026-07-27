// apps/frontend/src/routes/(protected)/dm/quests/_planner/types.ts

/** Persisted on Quest.encounterPlan — matches @core/database QuestEncounterPlan. */
export type QuestEncounterPlan = {
	level: number;
	partySize: number;
	adjustment: number;
	lairXp: number;
	encounters: { monsters: { cr: number; count: number }[] }[];
};

/** UI state — encounters carry stable ids for Svelte keys. */
export type PlannerEncounter = {
	id: number;
	monsters: { cr: number; count: number }[];
};

export type PlannerState = {
	level: number;
	partySize: number;
	adjustPct: number;
	lairXp: number;
	encounters: PlannerEncounter[];
	nextId: number;
};
