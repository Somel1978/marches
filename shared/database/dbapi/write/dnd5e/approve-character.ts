// shared/database/dbapi/write/dnd5e/approve-character.ts
import { db, Prisma } from '../../../index.ts';
import { parseAndFilterInnateSpells, addInnateSpellGrants, removeInnateSpellGrantsBySource } from './innate-spells.ts';
import { approveCharacter, rejectCharacter } from '../characters/approve.ts';
import { syncBackgroundFeatGrant } from './background-feat-grant.ts';
import { syncSpeciesTraitGrants } from './species-trait-grants.ts';

// Apply auto-granted skills, saves, tools, languages, and damage modifiers
// from class features for a character's current level allocation.
// Called on approval after classes are updated.
async function applyClassFeatureGrants(characterId: string, characterLevel: number, gameSystemId: string) {
    const classes = await db.dnd5eCharacterClass.findMany({ where: { characterId } });

    for (const cc of classes) {
        const features = await db.dnd5eClassFeature.findMany({
            where: { classId: cc.classId, requiredLevel: { lte: cc.allocatedLevel } },
        });
        const subclassFeatures = cc.subclassId ? await db.dnd5eSubclassFeature.findMany({
            where: { subclassId: cc.subclassId, requiredLevel: { lte: cc.allocatedLevel } },
        }) : [];

        const allFeatures = [
            ...features.map(f => ({ ...f, sourceType: 'ClassFeature' as const })),
            ...subclassFeatures.map(f => ({ ...f, sourceType: 'SubclassFeature' as const })),
        ];

        for (const f of allFeatures) {
            const sourceId   = f.id;
            const sourceType = f.sourceType;

            const fixedProfSkills = new Set(
                ((f as any).grantsSkills ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
            );
            const fixedExpertiseSkills = new Set(
                ((f as any).grantsExpertise ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
            );
            const fixedHalfSkills = new Set(
                ((f as any).grantsHalfSkills ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
            );

            // Preserve player-resolved choice pools (skills/expertise/half) — these are
            // written at creation/level-up and must survive approval re-sync of fixed grants.
            const existingSkillGrants = await db.dnd5eCharacterSkillGrant.findMany({
                where: { characterId, sourceId },
            });
            const preservedSkillGrants = existingSkillGrants.filter(g => {
                const skill = g.skill as string;
                const value = g.value as number;
                if (value === 1.0 && fixedProfSkills.has(skill)) return false;
                if (value === 2.0 && fixedExpertiseSkills.has(skill)) return false;
                if (value === 0.5 && fixedHalfSkills.has(skill)) return false;
                return true;
            });

            // Remove existing grants from this feature (handles level-down cleanly)
            await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId, sourceId } });
            await db.dnd5eCharacterSavingThrowGrant.deleteMany({ where: { characterId, sourceId } });
            await db.dnd5eCharacterToolGrant.deleteMany({ where: { characterId, sourceId } });
            await db.dnd5eCharacterLanguageGrant.deleteMany({ where: { characterId, sourceId } });
            await db.dnd5eCharacterDamageModifierGrant.deleteMany({ where: { characterId, sourceId } });

            // ── Skill grants ──────────────────────────────────────────────────
            const skillGrants: { skill: string; value: number }[] = [];
            if ((f as any).grantsSkills) {
                for (const s of (f as any).grantsSkills.split(',').filter(Boolean))
                    skillGrants.push({ skill: s.trim(), value: 1.0 });
            }
            if ((f as any).grantsExpertise) {
                for (const s of (f as any).grantsExpertise.split(',').filter(Boolean))
                    skillGrants.push({ skill: s.trim(), value: 2.0 });
            }
            if ((f as any).grantsHalfSkills) {
                for (const s of (f as any).grantsHalfSkills.split(',').filter(Boolean))
                    skillGrants.push({ skill: s.trim(), value: 0.5 });
            }
            if (skillGrants.length) {
                await db.dnd5eCharacterSkillGrant.createMany({
                    data: skillGrants.map(g => ({ characterId, skill: g.skill as any, value: g.value, sourceType, sourceId })),
                });
            }
            if (preservedSkillGrants.length) {
                await db.dnd5eCharacterSkillGrant.createMany({
                    data: preservedSkillGrants.map(g => ({
                        characterId,
                        skill: g.skill as any,
                        value: g.value,
                        sourceType: g.sourceType,
                        sourceId: g.sourceId,
                    })),
                });
            }

            // ── Saving throw grants ───────────────────────────────────────────
            if ((f as any).grantsSavingThrows) {
                const stats = (f as any).grantsSavingThrows.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (stats.length) {
                    await db.dnd5eCharacterSavingThrowGrant.createMany({
                        data: stats.map((stat: string) => ({ characterId, stat, sourceType, sourceId })),
                    });
                }
            }

            // ── Tool grants ───────────────────────────────────────────────────
            if ((f as any).grantsTools) {
                const tools = (f as any).grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (tools.length) {
                    await db.dnd5eCharacterToolGrant.createMany({
                        data: tools.map((tool: string) => ({ characterId, tool, sourceType, sourceId })),
                    });
                }
            }

            // ── Language grants ───────────────────────────────────────────────
            if ((f as any).grantsLanguages) {
                const langs = (f as any).grantsLanguages.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (langs.length) {
                    await db.dnd5eCharacterLanguageGrant.createMany({
                        data: langs.map((language: string) => ({ characterId, language, sourceType, sourceId })),
                    });
                }
            }

            // ── Damage modifier grants ────────────────────────────────────────
            const dmgGrants: { modifierType: string; damageType: string }[] = [];
            if ((f as any).grantsResistances) {
                for (const t of (f as any).grantsResistances.split(',').filter(Boolean))
                    dmgGrants.push({ modifierType: 'RESISTANCE', damageType: t.trim() });
            }
            if ((f as any).grantsImmunities) {
                for (const t of (f as any).grantsImmunities.split(',').filter(Boolean))
                    dmgGrants.push({ modifierType: 'IMMUNITY', damageType: t.trim() });
            }
            if ((f as any).grantsVulnerabilities) {
                for (const t of (f as any).grantsVulnerabilities.split(',').filter(Boolean))
                    dmgGrants.push({ modifierType: 'VULNERABILITY', damageType: t.trim() });
            }
            if (dmgGrants.length) {
                await db.dnd5eCharacterDamageModifierGrant.createMany({
                    data: dmgGrants.map(g => ({ characterId, modifierType: g.modifierType, damageType: g.damageType, sourceType, sourceId })),
                });
            }

            // Note: choice pools (skillChoiceCount/Pool, toolChoiceCount/Pool, etc.)
            // are resolved at character creation/level-up via the wizard or level-up UI.

            // ── Innate spells ─────────────────────────────────────────────────
            if ((f as any).grantsInnateSpells) {
                // Delete existing grants from this source, re-apply filtered to current level
                await removeInnateSpellGrantsBySource(characterId, sourceId);
                const innateGrants = await parseAndFilterInnateSpells(
                    (f as any).grantsInnateSpells,
                    gameSystemId,
                    characterLevel,
                    sourceType,
                    sourceId,
                );
                if (innateGrants.length) await addInnateSpellGrants(characterId, innateGrants);
            }
        }
    }
}

// Apply dnd5e pending changes (classes, species, background) then approve
export async function approveDnd5eCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id }, include: { classes: true, dnd5eSheet: true } });
    if (!character) throw new Error(`Character ${id} not found`);

    const sheet   = (character as any).dnd5eSheet;
    const pending = sheet?.pendingChanges as any ?? null;
    let newLevel  = character.level;

    if (pending) {
        await db.$transaction(async (tx) => {
            if (pending.classes) {
                const classMap = new Map<string, any>();
                for (const c of pending.classes) classMap.set(c.classId, c);
                const deduped = Array.from(classMap.values());
                newLevel = deduped.reduce((s: number, c: any) => s + (c.allocatedLevel ?? 0), 0);

                await tx.dnd5eCharacterClass.deleteMany({ where: { characterId: id } });
                await tx.dnd5eCharacterClass.createMany({
                    data: deduped.map((c: any) => ({
                        characterId:    id,
                        classId:        c.classId,
                        subclassId:     c.subclassId ?? null,
                        allocatedLevel: c.allocatedLevel,
                    })),
                });
            }

            if (sheet) {
                await tx.dnd5eCharacterSheet.update({
                    where: { characterId: id },
                    data: {
                        ...(pending.speciesId    !== undefined && { speciesId:    pending.speciesId    }),
                        ...(pending.backgroundId !== undefined && { backgroundId: pending.backgroundId }),
                        pendingChanges: Prisma.JsonNull,
                    },
                });

                // Keep the auto-granted background feat in sync when background changes.
                if (pending.backgroundId !== undefined) {
                    await syncBackgroundFeatGrant(tx, id, pending.backgroundId, sheet.backgroundId ?? null);
                }
            }

            if (pending.worldId !== undefined || pending.isGlobal !== undefined) {
                await tx.character.update({
                    where: { id },
                    data: {
                        ...(pending.worldId  !== undefined && { worldId:  pending.worldId  }),
                        ...(pending.isGlobal !== undefined && { isGlobal: pending.isGlobal }),
                    },
                });
            }
        });
        const freshChar = await db.character.findUnique({ where: { id }, select: { level: true, gameSystemId: true } });
        await applyClassFeatureGrants(id, freshChar?.level ?? newLevel, freshChar?.gameSystemId ?? '');

        // Keep species-trait-sourced grants (skills/tools/languages/dmg mods/innate
        // spells) in sync when species changes. Fixed grants only — choice pools
        // still require the player to pick via the pending-choices UI.
        if (sheet && pending.speciesId !== undefined) {
            await syncSpeciesTraitGrants(
                id,
                freshChar?.gameSystemId ?? '',
                freshChar?.level ?? newLevel,
                pending.speciesId,
                sheet.speciesId ?? null,
            );
        }
    }

    return approveCharacter(id, actorId, newLevel);
}

// Clear dnd5e pendingChanges then reject
export async function rejectDnd5eCharacter(id: string, note: string, actorId: string) {
    const sheet = await db.dnd5eCharacterSheet.findUnique({ where: { characterId: id } });
    if (sheet) {
        await db.dnd5eCharacterSheet.update({ where: { characterId: id }, data: { pendingChanges: Prisma.JsonNull } });
    }
    return rejectCharacter(id, note, actorId);
}