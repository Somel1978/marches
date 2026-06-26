// shared/database/dbapi/write/dnd5e/approve-character.ts
import { db, Prisma } from '../../../index.ts';
import { approveCharacter, rejectCharacter } from '../characters/approve.ts';

// Apply auto-granted skills from class features for a character's current level allocation.
// Called on approval after classes are updated.
async function applyClassFeatureGrants(characterId: string) {
    const classes = await db.dnd5eCharacterClass.findMany({ where: { characterId } });

    for (const cc of classes) {
        // Get all features for this class up to the character's allocated level
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

            // Remove existing grants from this feature (handles level-down cleanly)
            await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId, sourceId } });
            await db.dnd5eCharacterSavingThrowGrant.deleteMany({ where: { characterId, sourceId } });

            // Apply fixed skill grants
            const skillGrants: { skill: string; value: number }[] = [];
            if ((f as any).grantsSkills) {
                for (const s of (f as any).grantsSkills.split(',').filter(Boolean)) {
                    skillGrants.push({ skill: s.trim(), value: 1.0 });
                }
            }
            if ((f as any).grantsExpertise) {
                for (const s of (f as any).grantsExpertise.split(',').filter(Boolean)) {
                    skillGrants.push({ skill: s.trim(), value: 2.0 });
                }
            }
            if ((f as any).grantsHalfSkills) {
                for (const s of (f as any).grantsHalfSkills.split(',').filter(Boolean)) {
                    skillGrants.push({ skill: s.trim(), value: 0.5 });
                }
            }
            if (skillGrants.length) {
                await db.dnd5eCharacterSkillGrant.createMany({
                    data: skillGrants.map(g => ({ characterId, skill: g.skill as any, value: g.value, sourceType, sourceId })),
                });
            }

            // Apply fixed saving throw grants
            if ((f as any).grantsSavingThrows) {
                const stats = (f as any).grantsSavingThrows.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (stats.length) {
                    await db.dnd5eCharacterSavingThrowGrant.createMany({
                        data: stats.map((stat: string) => ({ characterId, stat, sourceType, sourceId })),
                    });
                }
            }

            // Note: skillChoiceCount/skillChoicePool grants are stored at character creation/level-up
            // via the wizard or level-up UI — not auto-applied here.
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
            }

            // Apply universal pending fields (worldId, isGlobal) directly on character
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
        // Apply class feature skill/save grants for the new level allocation
        await applyClassFeatureGrants(id);
    }

    // Delegate universal approval (status, audit, notifications)
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