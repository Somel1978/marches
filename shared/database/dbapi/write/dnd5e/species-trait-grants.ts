// shared/database/dbapi/write/dnd5e/species-trait-grants.ts
// Applies fixed (non-choice) skill/tool/language/damage-modifier/innate-spell grants
// from a character's active Species traits. Mirrors applyClassFeatureGrants in
// approve-character.ts but scoped to Dnd5eSpeciesTrait rows, keyed by
// sourceType='SpeciesTrait', sourceId=trait.id.
//
// NOTE: at initial character creation the wizard submits these grants itself
// (computed client-side and posted as form fields alongside the create action),
// so this module is only needed to keep grants in sync when a character's
// species changes AFTER creation (player-submitted edit, DM/admin direct edit).
import { db } from '../../../index.ts';
import { addInnateSpellGrants, removeInnateSpellGrantsBySource, parseAndFilterInnateSpells } from './innate-spells.ts';

async function applySpeciesTraitFixedGrants(
    characterId: string,
    speciesId:    string | null,
    gameSystemId: string,
    characterLevel: number,
) {
    if (!speciesId) return;
    const traits = await db.dnd5eSpeciesTrait.findMany({ where: { speciesId } });

    for (const t of traits as any[]) {
        const sourceType = 'SpeciesTrait';
        const sourceId   = t.id;

        // Remove any existing grants from this trait first (handles species swap cleanly)
        await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId, sourceId } });
        await db.dnd5eCharacterToolGrant.deleteMany({ where: { characterId, sourceId } });
        await db.dnd5eCharacterLanguageGrant.deleteMany({ where: { characterId, sourceId } });
        await db.dnd5eCharacterDamageModifierGrant.deleteMany({ where: { characterId, sourceId } });

        // ── Skill grants (fixed, non-choice) ────────────────────────────────
        const skillGrants: { skill: string; value: number }[] = [];
        if (t.grantsSkills)     for (const s of t.grantsSkills.split(',').filter(Boolean))     skillGrants.push({ skill: s.trim(), value: 1.0 });
        if (t.grantsExpertise)  for (const s of t.grantsExpertise.split(',').filter(Boolean))  skillGrants.push({ skill: s.trim(), value: 2.0 });
        if (t.grantsHalfSkills) for (const s of t.grantsHalfSkills.split(',').filter(Boolean)) skillGrants.push({ skill: s.trim(), value: 0.5 });
        if (skillGrants.length) {
            await db.dnd5eCharacterSkillGrant.createMany({
                data: skillGrants.map(g => ({ characterId, skill: g.skill as any, value: g.value, sourceType, sourceId })),
            });
        }

        // ── Tool grants ──────────────────────────────────────────────────────
        if (t.grantsTools) {
            const tools = t.grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (tools.length) {
                await db.dnd5eCharacterToolGrant.createMany({
                    data: tools.map((tool: string) => ({ characterId, tool, sourceType, sourceId })),
                });
            }
        }

        // ── Language grants ──────────────────────────────────────────────────
        if (t.grantsLanguages) {
            const langs = t.grantsLanguages.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (langs.length) {
                await db.dnd5eCharacterLanguageGrant.createMany({
                    data: langs.map((language: string) => ({ characterId, language, sourceType, sourceId })),
                });
            }
        }

        // ── Damage modifier grants ───────────────────────────────────────────
        const dmgGrants: { modifierType: string; damageType: string }[] = [];
        if (t.grantsResistances)     for (const d of t.grantsResistances.split(',').filter(Boolean))     dmgGrants.push({ modifierType: 'RESISTANCE',    damageType: d.trim() });
        if (t.grantsImmunities)      for (const d of t.grantsImmunities.split(',').filter(Boolean))      dmgGrants.push({ modifierType: 'IMMUNITY',      damageType: d.trim() });
        if (t.grantsVulnerabilities) for (const d of t.grantsVulnerabilities.split(',').filter(Boolean)) dmgGrants.push({ modifierType: 'VULNERABILITY', damageType: d.trim() });
        if (dmgGrants.length) {
            await db.dnd5eCharacterDamageModifierGrant.createMany({
                data: dmgGrants.map(g => ({ characterId, modifierType: g.modifierType, damageType: g.damageType, sourceType, sourceId })),
            });
        }

        // ── Innate spells ─────────────────────────────────────────────────────
        if (t.grantsInnateSpells) {
            await removeInnateSpellGrantsBySource(characterId, sourceId);
            const innateGrants = await parseAndFilterInnateSpells(t.grantsInnateSpells, gameSystemId, characterLevel, sourceType, sourceId);
            if (innateGrants.length) await addInnateSpellGrants(characterId, innateGrants);
        }
    }
}

// Remove all species-trait-sourced grants for traits belonging to a given species.
// Used when switching away from a species so stale grants don't linger.
async function clearSpeciesTraitGrants(characterId: string, speciesId: string | null) {
    if (!speciesId) return;
    const traits   = await db.dnd5eSpeciesTrait.findMany({ where: { speciesId }, select: { id: true } });
    const traitIds = traits.map(t => t.id);
    if (!traitIds.length) return;

    await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId, sourceId: { in: traitIds } } });
    await db.dnd5eCharacterToolGrant.deleteMany({ where: { characterId, sourceId: { in: traitIds } } });
    await db.dnd5eCharacterLanguageGrant.deleteMany({ where: { characterId, sourceId: { in: traitIds } } });
    await db.dnd5eCharacterDamageModifierGrant.deleteMany({ where: { characterId, sourceId: { in: traitIds } } });
    for (const traitId of traitIds) await removeInnateSpellGrantsBySource(characterId, traitId);
}

// Sync species-trait-sourced grants when a character's species changes.
// No-op if the species hasn't actually changed.
export async function syncSpeciesTraitGrants(
    characterId:     string,
    gameSystemId:    string,
    characterLevel:  number,
    newSpeciesId:    string | null,
    oldSpeciesId:    string | null,
) {
    if (newSpeciesId === oldSpeciesId) return;
    await clearSpeciesTraitGrants(characterId, oldSpeciesId);
    await applySpeciesTraitFixedGrants(characterId, newSpeciesId, gameSystemId, characterLevel);
}
