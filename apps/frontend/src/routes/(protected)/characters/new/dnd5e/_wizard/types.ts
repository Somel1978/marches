// apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/types.ts
// Shared types for the dnd5e character creation wizard.

export const STATS = ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'] as const;
export type Stat = (typeof STATS)[number];

export const STAT_LABEL: Record<string, string> = {
	STRENGTH: 'STR', DEXTERITY: 'DEX', CONSTITUTION: 'CON',
	INTELLIGENCE: 'INT', WISDOM: 'WIS', CHARISMA: 'CHA',
};

export type ClassAlloc = {
	classId: string;
	subclassId: string;
	allocatedLevel: number;
};

export type AsiChoice = {
	sourceClassId: string;
	sourceLevel: number;
	type: 'asi' | 'epic_boon';
	canEpicBoon: boolean;
	mode: 'stat' | 'feat' | null;
	stat1: string;
	amount1: number;
	stat2: string;
	amount2: number;
	featId: string;
	sourceName: string;
	featGrantedStat?: string;
	featAsiAmount?: number;
	featAsiFixed?: string;
};

// A generic "choose N from pool" specification — used for skills, tools,
// languages, saving throws, expertise, and damage modifiers alike.
export type ChoicePoolSpec = {
	sourceId: string;          // key used for chosen-picks state (unique per pool)
	sourceDbId?: string | null; // actual DB UUID to submit as sourceId (falls back to sourceId)
	sourceType: string;        // "Background" | "SpeciesTrait" | "ClassFeature" | "SubclassFeature" | "Feat"
	label: string;
	count: number;
	pool: string[];
};

export type DmgModChoice = ChoicePoolSpec & {
	modifierType: 'RESISTANCE' | 'IMMUNITY' | 'VULNERABILITY';
};

// A source that may grant a fixed feat or let the player pick one from a category.
export type FeatGrantSource = {
	sourceKey: string;   // unique key for featureFeatPicks state, e.g. 'st-{traitId}', 'cf-{featureId}'
	label: string;
	fixedFeatId?: string;
	category?: string;
};

export type InnateSpellSource = {
	raw: string;
	sourceType: string;
	sourceId: string;
};

export type SkillGrant = { skill: string; sourceName?: string };
export type SaveGrant = { stat: string; sourceName?: string; sourceType?: string; sourceId?: string | null };
export type ToolGrant = { tool: string; sourceType: string; sourceId: string | null };
export type LanguageGrant = { language: string; sourceType: string; sourceId: string | null };
export type SpeedGrant = { movementType: string; speed: number };
export type InnateSpellDisplay = { name: string; minCharLevel: number; usesPerDay: number | null; sourceType: string; sourceId: string };
