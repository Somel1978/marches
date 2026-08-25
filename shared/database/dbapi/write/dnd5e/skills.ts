// shared/database/dbapi/write/dnd5e/skills.ts
import { db } from '../../../index.ts';

export type SkillGrantInput = {
    skill:      string;           // Dnd5eSkillName
    value:      number;           // 0.5 | 1.0 | 2.0
    sourceType: string;           // "Background"|"ClassFeature"|"SubclassFeature"|"SpeciesTrait"|"Feat"|"PlayerChoice"
    sourceId?:  string | null;    // FK to granting entity
};

export type SaveGrantInput = {
    stat:       string;           // "STRENGTH" etc.
    sourceType: string;
    sourceId?:  string | null;
};

// Insert skill grants for a character from a specific source.
// Does NOT delete existing grants — each call adds to the log.
export async function addCharacterSkillGrants(characterId: string, grants: SkillGrantInput[]) {
    if (!grants.length) return;
    await db.dnd5eCharacterSkillGrant.createMany({
        data: grants.map(g => ({
            characterId,
            skill:      g.skill as any,
            value:      g.value,
            sourceType: g.sourceType,
            sourceId:   g.sourceId ?? null,
        })),
    });
}

// Remove all skill grants from a specific source (e.g. feat removed, level down).
export async function removeCharacterSkillGrantsBySource(characterId: string, sourceId: string) {
    await db.dnd5eCharacterSkillGrant.deleteMany({
        where: { characterId, sourceId },
    });
}

// Replace all grants for a character from a specific sourceType + sourceId.
export async function replaceCharacterSkillGrants(
    characterId: string,
    sourceType:  string,
    sourceId:    string,
    grants:      SkillGrantInput[],
) {
    await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId, sourceType, sourceId } });
    if (grants.length) {
        await db.dnd5eCharacterSkillGrant.createMany({
            data: grants.map(g => ({ characterId, skill: g.skill as any, value: g.value, sourceType, sourceId })),
        });
    }
}

// ── Manual override ────────────────────────────────────────────────────────────
// One row per skill per character with sourceType='Override'.
// `note` records who changed it and why (e.g. "DM: corrected from class feature").
// Replaces previous Player/DM/Admin multi-row approach.

export async function upsertOverrideSkillGrant(
    characterId: string,
    skill: string,
    value: number,
    note?: string | null,
) {
    const existing = await db.dnd5eCharacterSkillGrant.findFirst({
        where: { characterId, skill: skill as any, sourceType: 'Override' },
    });
    if (existing) {
        return db.dnd5eCharacterSkillGrant.update({
            where: { id: existing.id },
            data:  { value, note: note ?? null },
        });
    }
    return db.dnd5eCharacterSkillGrant.create({
        data: { characterId, skill: skill as any, value, sourceType: 'Override', sourceId: null, note: note ?? null },
    });
}

export async function removeOverrideSkillGrant(
    characterId: string,
    skill: string,
) {
    // Remove the single Override row. Also clean up any legacy Player/DM/Admin rows
    // left over from previous implementations so they don't ghost the value.
    await db.dnd5eCharacterSkillGrant.deleteMany({
        where: { characterId, skill: skill as any, sourceType: { in: ['Override', 'Player', 'DM', 'Admin'] } },
    });
}

// Back-compat wrapper — old callers that passed a role are now unified.
export async function upsertDmSkillGrant(characterId: string, skill: string, value: number) {
    return upsertOverrideSkillGrant(characterId, skill, value, 'DM override');
}

// ── Saving throws ─────────────────────────────────────────────────────────────

export async function addCharacterSavingThrowGrants(characterId: string, grants: SaveGrantInput[]) {
    if (!grants.length) return;
    await db.dnd5eCharacterSavingThrowGrant.createMany({
        data: grants.map(g => ({
            characterId,
            stat:       g.stat,
            sourceType: g.sourceType,
            sourceId:   g.sourceId ?? null,
        })),
    });
}

export async function removeCharacterSavingThrowGrantsBySource(characterId: string, sourceId: string) {
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({ where: { characterId, sourceId } });
}

// One Override row per stat per character. sourceId='__SUPPRESS__' forces non-proficient.
export async function upsertOverrideSavingThrowGrant(
    characterId: string,
    stat: string,
    proficient: boolean,
    note?: string | null,
) {
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({
        where: { characterId, stat: stat as any, sourceType: { in: ['Override', 'Player', 'DM', 'Admin'] } },
    });
    return db.dnd5eCharacterSavingThrowGrant.create({
        data: {
            characterId,
            stat:       stat as any,
            sourceType: 'Override',
            sourceId:   proficient ? null : '__SUPPRESS__',
            note:       note ?? null,
        },
    });
}

export async function removeOverrideSavingThrowGrant(
    characterId: string,
    stat: string,
) {
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({
        where: { characterId, stat: stat as any, sourceType: { in: ['Override', 'Player', 'DM', 'Admin'] } },
    });
}