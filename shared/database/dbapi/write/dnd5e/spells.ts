// shared/database/dbapi/write/dnd5e/spells.ts
import { db } from '../../../index.ts';

// ── Spells ────────────────────────────────────────────────────────────────────

export async function upsertDnd5eSpell(input: {
    gameSystemId:            string;
    spellId:                 number;
    name:                    string;
    link?:                   string | null;
    level:                   number;
    school:                  string;
    concentration:           boolean;
    ritual:                  boolean;
    isHomebrew:              boolean;
    isLegacy:                boolean;
    cantripDamage?:          string | null;
    cantripDamageLvl5?:      string | null;
    cantripDamageLvl11?:     string | null;
    cantripDamageLvl17?:     string | null;
    spellDamage?:            string | null;
    spellUpcastPerSlot?:     string | null;
    spellUpcastEveryTwoSlots?: string | null;
    spellProgression?:       string | null;
    spellProgressionNote?:   string | null;
    rangeOrigin?:            string | null;
    rangeValue?:             number | null;
    aoeType?:                string | null;
    aoeValue?:               number | null;
    durationType?:           string | null;
    durationInterval?:       number | null;
    durationUnit?:           string | null;
    requiresSavingThrow:     boolean;
    savingThrow?:     string | null;
    requiresAttackRoll:      boolean;
    canCastAtHigherLevel:    boolean;
    castingTime?:            string | null;
    components?:             string | null;
    description?:            string | null;
    sourceBook?:             string | null;
    tags?:                   string | null;
    spellList?:              string | null;
}) {
    const { gameSystemId, spellId, ...rest } = input;
    return db.dnd5eSpell.upsert({
        where: { gameSystemId_spellId: { gameSystemId, spellId } },
        create: { gameSystemId, spellId, ...rest },
        update: rest,
    });
}

export async function updateDnd5eSpell(id: number, input: Partial<{
    name:                    string;
    link:                    string | null;
    level:                   number;
    school:                  string;
    concentration:           boolean;
    ritual:                  boolean;
    isHomebrew:              boolean;
    isLegacy:                boolean;
    cantripDamage:           string | null;
    cantripDamageLvl5:       string | null;
    cantripDamageLvl11:      string | null;
    cantripDamageLvl17:      string | null;
    spellDamage:             string | null;
    spellUpcastPerSlot:      string | null;
    spellUpcastEveryTwoSlots: string | null;
    spellProgression:        string | null;
    spellProgressionNote:    string | null;
    rangeOrigin:             string | null;
    rangeValue:              number | null;
    aoeType:                 string | null;
    aoeValue:                number | null;
    durationType:            string | null;
    durationInterval:        number | null;
    durationUnit:            string | null;
    requiresSavingThrow:     boolean;
    savingThrow:      string | null;
    requiresAttackRoll:      boolean;
    canCastAtHigherLevel:    boolean;
    castingTime:             string | null;
    components:              string | null;
    description:             string | null;
    sourceBook:              string | null;
    tags:                    string | null;
    spellList:               string | null;
}>) {
    return db.dnd5eSpell.update({ where: { id }, data: input });
}

export async function deleteDnd5eSpell(id: number) {
    return db.dnd5eSpell.delete({ where: { id } });
}

// ── Spell Slot Progression ────────────────────────────────────────────────────

export async function upsertSpellSlotProgression(input: {
    gameSystemId: string;
    classId:      string;
    className:    string;
    subclassId:   string;
    subclassName: string;
    casterType:   string;
    classLevel:   number;
    slot1: number; slot2: number; slot3: number;
    slot4: number; slot5: number; slot6: number;
    slot7: number; slot8: number; slot9: number;
}) {
    const { gameSystemId, classId, subclassId, classLevel, ...rest } = input;
    return db.dnd5eSpellSlotProgression.upsert({
        where: { gameSystemId_classId_subclassId_classLevel: { gameSystemId, classId, subclassId, classLevel } },
        create: { gameSystemId, classId, subclassId, classLevel, ...rest },
        update: rest,
    });
}

export async function deleteSpellSlotProgressionClass(gameSystemId: string, classId: string, subclassId = '') {
    return db.dnd5eSpellSlotProgression.deleteMany({ where: { gameSystemId, classId, subclassId } });
}

// ── Spells Known Progression ──────────────────────────────────────────────────

export async function upsertSpellsKnownProgression(input: {
    gameSystemId: string;
    classId:      string;
    className:    string;
    subclassId:   string;
    subclassName: string;
    classLevel:   number;
    cantrips?:    number | null;
    prepared?:    number | null;
    additional?:  number | null;
    note?:        string | null;
}) {
    const { gameSystemId, classId, subclassId, classLevel, ...rest } = input;
    return db.dnd5eSpellsKnownProgression.upsert({
        where: { gameSystemId_classId_subclassId_classLevel: { gameSystemId, classId, subclassId, classLevel } },
        create: { gameSystemId, classId, subclassId, classLevel, ...rest },
        update: rest,
    });
}

export async function deleteSpellsKnownProgressionClass(gameSystemId: string, classId: string, subclassId = '') {
    return db.dnd5eSpellsKnownProgression.deleteMany({ where: { gameSystemId, classId, subclassId } });
}

// ── Spellbooks ────────────────────────────────────────────────────────────────

export async function createSpellbook(input: { characterId: string; name: string }) {
    return db.dnd5eSpellbook.create({ data: input });
}

export async function updateSpellbook(id: string, name: string) {
    return db.dnd5eSpellbook.update({ where: { id }, data: { name } });
}

export async function deleteSpellbook(id: string) {
    return db.dnd5eSpellbook.delete({ where: { id } });
}

export async function addSpellbookEntry(input: {
    spellbookId: string;
    spellId:     number;
    classId:     string;
    className:   string;
    prepared?:   boolean;
}) {
    return db.dnd5eSpellbookEntry.create({ data: input });
}

export async function removeSpellbookEntry(id: string) {
    return db.dnd5eSpellbookEntry.delete({ where: { id } });
}

export async function toggleSpellbookEntryPrepared(id: string, prepared: boolean) {
    return db.dnd5eSpellbookEntry.update({ where: { id }, data: { prepared } });
}