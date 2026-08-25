// shared/ui/src/gamesystems/dnd5e/skills.ts
// Skill definitions — used by both UI (display) and DB layer (modifier computation).
// NOTE: this file is intentionally duplicated in shared/database/dbapi/read/dnd5e/skills.ts
// because @core/ui and @core/database cannot cross-depend.

export const SKILL_ABILITY: Record<string, string> = {
    ACROBATICS:      'DEXTERITY',
    ANIMAL_HANDLING: 'WISDOM',
    ARCANA:          'INTELLIGENCE',
    ATHLETICS:       'STRENGTH',
    DECEPTION:       'CHARISMA',
    HISTORY:         'INTELLIGENCE',
    INSIGHT:         'WISDOM',
    INTIMIDATION:    'CHARISMA',
    INVESTIGATION:   'INTELLIGENCE',
    MEDICINE:        'WISDOM',
    NATURE:          'INTELLIGENCE',
    PERCEPTION:      'WISDOM',
    PERFORMANCE:     'CHARISMA',
    PERSUASION:      'CHARISMA',
    RELIGION:        'INTELLIGENCE',
    SLEIGHT_OF_HAND: 'DEXTERITY',
    STEALTH:         'DEXTERITY',
    SURVIVAL:        'WISDOM',
};

export const ALL_SKILLS = Object.keys(SKILL_ABILITY) as (keyof typeof SKILL_ABILITY)[];

export const ALL_STATS = ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'] as const;

export const STAT_ABBR: Record<string, string> = {
    STRENGTH:     'STR', DEXTERITY:    'DEX', CONSTITUTION: 'CON',
    INTELLIGENCE: 'INT', WISDOM:       'WIS', CHARISMA:     'CHA',
};

export const SKILL_DISPLAY: Record<string, string> = {
    ACROBATICS:      'Acrobatics',
    ANIMAL_HANDLING: 'Animal Handling',
    ARCANA:          'Arcana',
    ATHLETICS:       'Athletics',
    DECEPTION:       'Deception',
    HISTORY:         'History',
    INSIGHT:         'Insight',
    INTIMIDATION:    'Intimidation',
    INVESTIGATION:   'Investigation',
    MEDICINE:        'Medicine',
    NATURE:          'Nature',
    PERCEPTION:      'Perception',
    PERFORMANCE:     'Performance',
    PERSUASION:      'Persuasion',
    RELIGION:        'Religion',
    SLEIGHT_OF_HAND: 'Sleight of Hand',
    STEALTH:         'Stealth',
    SURVIVAL:        'Survival',
};

export function proficiencyBonus(totalLevel: number): number {
    if (totalLevel <= 4)  return 2;
    if (totalLevel <= 8)  return 3;
    if (totalLevel <= 12) return 4;
    if (totalLevel <= 16) return 5;
    return 6;
}

export function abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function skillModifier(
    skill:         string,
    abilityScores: { stat: string; baseScore: number }[],
    proficiency:   'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT',
    totalLevel:    number,
): number {
    const ability = SKILL_ABILITY[skill];
    const score   = abilityScores.find(a => a.stat === ability)?.baseScore ?? 10;
    const mod     = abilityModifier(score);
    const pb      = proficiencyBonus(totalLevel);
    if (proficiency === 'EXPERT')          return mod + pb * 2;
    if (proficiency === 'PROFICIENT')      return mod + pb;
    if (proficiency === 'HALF_PROFICIENT') return mod + Math.floor(pb / 2);
    return mod;
}

export function savingThrowModifier(
    stat:          string,
    abilityScores: { stat: string; baseScore: number }[],
    proficient:    boolean,
    totalLevel:    number,
): number {
    const score = abilityScores.find(a => a.stat === stat)?.baseScore ?? 10;
    const mod   = abilityModifier(score);
    const pb    = proficiencyBonus(totalLevel);
    return proficient ? mod + pb : mod;
}

export const MOOD_EMOJIS = [
    { label: 'Condition', emojis: ['💪','🤕','😴','😵','🩹','🥵','🥶','⚡','🔥','✨'] },
    { label: 'Emotion',   emojis: ['😊','😤','😨','😰','😠','😢','😏','🤔','🤩','😈'] },
    { label: 'Adventure', emojis: ['⚔️','🛡️','🎯','💀','🏃','🧙','🤺','🗡️','🎲','🔮'] },
    { label: 'Social',    emojis: ['🤫','🤝','🙏','😇','👁️','💬','🤐','🤑','😤','🫡'] },
];