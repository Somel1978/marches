// shared/database/dbapi/write/dnd5e/innate-spells.ts
// Innate spellcasting grant management.
// Each grant source (ClassFeature, SubclassFeature, SpeciesTrait, Feat, Background)
// writes its own rows keyed by sourceId. Deletion is always by sourceId — same
// pattern as removeCharacterSkillGrantsBySource.
import { db } from '../../../index.ts';

export type InnateSpellGrant = {
    spellId:         number;   // Dnd5eSpell.spellId
    usesPerDay:      number | null; // null = at will
    canUseSpellSlots: boolean;
    minCharLevel:    number;   // character level at which this spell is granted
    sourceType:      string;   // "ClassFeature"|"SubclassFeature"|"SpeciesTrait"|"Feat"|"Background"
    sourceId:        string;   // UUID of granting entity — deletion key
};

// Find or create the innate spellbook for a character.
async function getOrCreateInnateSpellbook(characterId: string) {
    const existing = await db.dnd5eSpellbook.findFirst({
        where: { characterId, isInnate: true },
    });
    if (existing) return existing;
    return db.dnd5eSpellbook.create({
        data: { characterId, name: 'Innate Spellcasting', isInnate: true },
    });
}

// Add innate spell grants for a character from a specific source.
// Does NOT delete existing grants first — caller handles cleanup.
export async function addInnateSpellGrants(
    characterId: string,
    grants: InnateSpellGrant[],
) {
    if (!grants.length) return;
    const spellbook = await getOrCreateInnateSpellbook(characterId);
    await db.dnd5eSpellbookEntry.createMany({
        data: grants.map(g => ({
            spellbookId:      spellbook.id,
            spellId:          g.spellId,
            classId:          null,
            className:        null,
            usesPerDay:       g.usesPerDay,
            canUseSpellSlots: g.canUseSpellSlots,
            minCharLevel:     g.minCharLevel,
            sourceType:       g.sourceType,
            sourceId:         g.sourceId,
        })),
    });
}

// Remove all innate spell grants from a specific source (e.g. feature removed, level-down).
// This is the primary deletion mechanism — never delete individual spells by name.
export async function removeInnateSpellGrantsBySource(
    characterId: string,
    sourceId: string,
) {
    const spellbook = await db.dnd5eSpellbook.findFirst({
        where: { characterId, isInnate: true },
        select: { id: true },
    });
    if (!spellbook) return;
    await db.dnd5eSpellbookEntry.deleteMany({
        where: { spellbookId: spellbook.id, sourceId },
    });
}

// Parse "SpellName:minCharLevel:usesPerDay[:canUseSpellSlots]" format,
// look up spell IDs by name, return grant objects filtered to character level.
// Called by approve-character and wizard server.
export async function parseAndFilterInnateSpells(
    grantsInnateSpells: string,
    gameSystemId: string,
    characterLevel: number,
    sourceType: string,
    sourceId: string,
): Promise<InnateSpellGrant[]> {
    const grants: InnateSpellGrant[] = [];
    const entries = grantsInnateSpells.split(',').map(s => s.trim()).filter(Boolean);

    for (const entry of entries) {
        const parts = entry.split(':').map(s => s.trim());
        const spellName      = parts[0];
        const minCharLevel   = parseInt(parts[1] ?? '1', 10) || 1;
        const usesPerDayRaw  = parseInt(parts[2] ?? '0', 10);
        const usesPerDay     = usesPerDayRaw === 0 ? null : usesPerDayRaw;
        const canUseSpellSlots = parts[3]?.toLowerCase() === 'true';

        // Only include spells available at the character's current level
        if (minCharLevel > characterLevel) continue;

        const spell = await db.dnd5eSpell.findFirst({
            where: { gameSystemId, name: { equals: spellName, mode: 'insensitive' }, isLegacy: false },
            select: { spellId: true },
        });
        if (!spell) continue;

        grants.push({ spellId: spell.spellId, usesPerDay, canUseSpellSlots, minCharLevel, sourceType, sourceId });
    }

    return grants;
}
