// shared/database/dbapi/write/dnd5e/tools-languages.ts
// Tool proficiency, language, and damage modifier grant management.
// Follows the exact same pattern as skills.ts — one Override row per
// tool/language/type per character; sourceType tracks the grant origin.
import { db } from '../../../index.ts';

// ── Tool proficiencies ────────────────────────────────────────────────────────

export async function addCharacterToolGrants(
    characterId: string,
    grants: { tool: string; sourceType: string; sourceId?: string | null }[],
) {
    if (!grants.length) return;
    await db.dnd5eCharacterToolGrant.createMany({
        data: grants.map(g => ({
            characterId,
            tool:       g.tool,
            sourceType: g.sourceType,
            sourceId:   g.sourceId ?? null,
        })),
    });
}

export async function removeCharacterToolGrantsBySource(characterId: string, sourceId: string) {
    await db.dnd5eCharacterToolGrant.deleteMany({ where: { characterId, sourceId } });
}

export async function upsertOverrideToolGrant(
    characterId: string,
    tool: string,
    note?: string | null,
) {
    const existing = await db.dnd5eCharacterToolGrant.findFirst({
        where: { characterId, tool, sourceType: 'Override' },
    });
    if (existing) {
        return db.dnd5eCharacterToolGrant.update({
            where: { id: existing.id },
            data:  { note: note ?? null },
        });
    }
    return db.dnd5eCharacterToolGrant.create({
        data: { characterId, tool, sourceType: 'Override', sourceId: null, note: note ?? null },
    });
}

export async function removeOverrideToolGrant(characterId: string, tool: string) {
    await db.dnd5eCharacterToolGrant.deleteMany({
        where: { characterId, tool, sourceType: { in: ['Override', 'DM', 'Admin', 'Player'] } },
    });
}

// ── Languages ─────────────────────────────────────────────────────────────────

export async function addCharacterLanguageGrants(
    characterId: string,
    grants: { language: string; sourceType: string; sourceId?: string | null }[],
) {
    if (!grants.length) return;
    await db.dnd5eCharacterLanguageGrant.createMany({
        data: grants.map(g => ({
            characterId,
            language:   g.language,
            sourceType: g.sourceType,
            sourceId:   g.sourceId ?? null,
        })),
    });
}

export async function removeCharacterLanguageGrantsBySource(characterId: string, sourceId: string) {
    await db.dnd5eCharacterLanguageGrant.deleteMany({ where: { characterId, sourceId } });
}

export async function upsertOverrideLanguageGrant(
    characterId: string,
    language: string,
    note?: string | null,
) {
    const existing = await db.dnd5eCharacterLanguageGrant.findFirst({
        where: { characterId, language, sourceType: 'Override' },
    });
    if (existing) {
        return db.dnd5eCharacterLanguageGrant.update({
            where: { id: existing.id },
            data:  { note: note ?? null },
        });
    }
    return db.dnd5eCharacterLanguageGrant.create({
        data: { characterId, language, sourceType: 'Override', sourceId: null, note: note ?? null },
    });
}

export async function removeOverrideLanguageGrant(characterId: string, language: string) {
    await db.dnd5eCharacterLanguageGrant.deleteMany({
        where: { characterId, language, sourceType: { in: ['Override', 'DM', 'Admin', 'Player'] } },
    });
}

// ── Damage modifiers (Resistances / Immunities / Vulnerabilities) ─────────────

export type DamageModifierType = 'RESISTANCE' | 'IMMUNITY' | 'VULNERABILITY';

export async function addCharacterDamageModifierGrants(
    characterId: string,
    grants: { modifierType: DamageModifierType; damageType: string; sourceType: string; sourceId?: string | null }[],
) {
    if (!grants.length) return;
    await db.dnd5eCharacterDamageModifierGrant.createMany({
        data: grants.map(g => ({
            characterId,
            modifierType: g.modifierType,
            damageType:   g.damageType,
            sourceType:   g.sourceType,
            sourceId:     g.sourceId ?? null,
        })),
    });
}

export async function removeCharacterDamageModifierGrantsBySource(characterId: string, sourceId: string) {
    await db.dnd5eCharacterDamageModifierGrant.deleteMany({ where: { characterId, sourceId } });
}

// Override: one row per (modifierType + damageType) per character.
export async function upsertOverrideDamageModifierGrant(
    characterId: string,
    modifierType: DamageModifierType,
    damageType: string,
    note?: string | null,
) {
    const existing = await db.dnd5eCharacterDamageModifierGrant.findFirst({
        where: { characterId, modifierType, damageType, sourceType: 'Override' },
    });
    if (existing) {
        return db.dnd5eCharacterDamageModifierGrant.update({
            where: { id: existing.id },
            data:  { note: note ?? null },
        });
    }
    return db.dnd5eCharacterDamageModifierGrant.create({
        data: { characterId, modifierType, damageType, sourceType: 'Override', sourceId: null, note: note ?? null },
    });
}

export async function removeOverrideDamageModifierGrant(
    characterId: string,
    modifierType: DamageModifierType,
    damageType: string,
) {
    await db.dnd5eCharacterDamageModifierGrant.deleteMany({
        where: { characterId, modifierType, damageType, sourceType: { in: ['Override', 'DM', 'Admin', 'Player'] } },
    });
}
