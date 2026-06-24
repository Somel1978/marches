// shared/database/dbapi/read/dnd5e/skills.ts
// NOTE: intentionally duplicates shared/ui/src/gamesystems/dnd5e/skills.ts
// @core/ui and @core/database cannot cross-depend — keep both in sync.

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

export const ALL_SKILLS = Object.keys(SKILL_ABILITY);
export const ALL_STATS  = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'];

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
