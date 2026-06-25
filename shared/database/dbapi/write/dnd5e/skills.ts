// shared/database/dbapi/write/dnd5e/skills.ts
import { db } from '../../../index.ts';
import { NotFoundError } from '@core/errors';

export type SkillGrantInput = {
    skill:      string;           // Dnd5eSkillName
    value:      number;           // 0.5 | 1.0 | 2.0
    sourceType: string;           // "Background"|"ClassFeature"|"SubclassFeature"|"SpeciesTrait"|"Feat"|"DM"|"PlayerChoice"
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

// Manual override grants — Player, DM, or Admin. Each role has its own row per skill.
// All overrides are tracked as removable rows. The aggregation in get-character-sheet.ts
// gives overrides priority over source-derived grants (Admin > DM > Player).
export type OverrideRole = 'Player' | 'DM' | 'Admin';

export async function upsertOverrideSkillGrant(
    characterId: string,
    skill: string,
    value: number,
    sourceType: OverrideRole,
    note?: string | null,
) {
    const existing = await db.dnd5eCharacterSkillGrant.findFirst({
        where: { characterId, skill: skill as any, sourceType },
    });
    if (existing) {
        return db.dnd5eCharacterSkillGrant.update({
            where: { id: existing.id },
            data:  { value, note: note ?? null },
        });
    }
    return db.dnd5eCharacterSkillGrant.create({
        data: { characterId, skill: skill as any, value, sourceType, sourceId: null, note: note ?? null },
    });
}

export async function removeOverrideSkillGrant(
    characterId: string,
    skill: string,
    sourceType: OverrideRole,
) {
    await db.dnd5eCharacterSkillGrant.deleteMany({
        where: { characterId, skill: skill as any, sourceType },
    });
}

// Back-compat wrapper for any older callers still using DM-only API.
export async function upsertDmSkillGrant(characterId: string, skill: string, value: number) {
    return upsertOverrideSkillGrant(characterId, skill, value, 'DM');
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

// Manual override saving throw grants — Player, DM, or Admin. A row alone = proficient.
// Pass proficient=false to write a __SUPPRESS__ row, forcing non-proficient even if
// other sources grant it. Either way, the override is tracked as a removable row.
export async function upsertOverrideSavingThrowGrant(
    characterId: string,
    stat: string,
    proficient: boolean,
    sourceType: OverrideRole,
    note?: string | null,
) {
    // Remove any existing override row for this role+stat first
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({
        where: { characterId, stat: stat as any, sourceType },
    });
    return db.dnd5eCharacterSavingThrowGrant.create({
        data: {
            characterId,
            stat:       stat as any,
            sourceType,
            sourceId:   proficient ? null : '__SUPPRESS__',
            note:       note ?? null,
        },
    });
}

export async function removeOverrideSavingThrowGrant(
    characterId: string,
    stat: string,
    sourceType: OverrideRole,
) {
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({
        where: { characterId, stat: stat as any, sourceType },
    });
}