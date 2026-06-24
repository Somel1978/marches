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

// Single upsert for manual DM grants (always sourceType = "DM").
export async function upsertDmSkillGrant(characterId: string, skill: string, value: number) {
    const existing = await db.dnd5eCharacterSkillGrant.findFirst({
        where: { characterId, skill: skill as any, sourceType: 'DM' },
    });
    if (existing) {
        return db.dnd5eCharacterSkillGrant.update({ where: { id: existing.id }, data: { value } });
    }
    return db.dnd5eCharacterSkillGrant.create({
        data: { characterId, skill: skill as any, value, sourceType: 'DM', sourceId: null },
    });
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