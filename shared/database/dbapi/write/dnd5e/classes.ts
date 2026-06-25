// shared/database/dbapi/write/dnd5e/classes.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

// ── Classes ───────────────────────────────────────────────────────────────────
export async function createDnd5eClass(input: {
    gameSystemId: string; name: string; description?: string; source?: string;
    link?: string; hitDice?: number; canCastSpells?: boolean;
    primaryAbilities?: string; equipmentDescription?: string; sortOrder?: number;
    subclassAvailableAtLevel?: number; skillChoiceCount?: number | null;
}, actorId: string) {
    const c = await db.dnd5eClass.create({ data: {
        gameSystemId:        input.gameSystemId,
        name:                input.name,
        description:         input.description         ?? null,
        source:              input.source              ?? null,
        link:                input.link                ?? null,
        hitDice:             input.hitDice             ?? null,
        canCastSpells:       input.canCastSpells        ?? false,
        primaryAbilities:    input.primaryAbilities     ?? null,
        equipmentDescription:      input.equipmentDescription      ?? null,
        sortOrder:                 input.sortOrder                 ?? 0,
        subclassAvailableAtLevel:  input.subclassAvailableAtLevel  ?? 3,
        skillChoiceCount:          input.skillChoiceCount          ?? null,
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: c.id, after: c });
    return c;
}

export async function updateDnd5eClass(id: string, input: Partial<{
    name: string; description: string | null; source: string | null;
    link: string | null; hitDice: number | null; canCastSpells: boolean;
    primaryAbilities: string | null; equipmentDescription: string | null;
    isAvailable: boolean; sortOrder: number; subclassAvailableAtLevel: number;
    skillChoiceCount: number | null;
}>, actorId: string) {
    const before = await db.dnd5eClass.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eClass', id);
    const c = await db.dnd5eClass.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: id, before, after: c });
    return c;
}

export async function deleteDnd5eClass(id: string, actorId: string) {
    const before = await db.dnd5eClass.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eClass', id);
    await db.dnd5eClass.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: id, before });
}

// ── Class Features ────────────────────────────────────────────────────────────
export async function createClassFeature(input: {
    classId: string; name: string; description?: string; requiredLevel: number; url?: string;
    grantsSkills?: string; grantsExpertise?: string; grantsHalfSkills?: string; grantsSavingThrows?: string;
    skillChoiceCount?: number | null; skillChoicePool?: string | null;
    savingThrowChoiceCount?: number | null; savingThrowChoicePool?: string | null;
}, actorId: string) {
    return db.dnd5eClassFeature.create({ data: {
        classId:            input.classId,
        name:               input.name,
        description:        input.description        ?? null,
        requiredLevel:      input.requiredLevel,
        url:                input.url                ?? null,
        grantsSkills:       input.grantsSkills       ?? null,
        grantsExpertise:    input.grantsExpertise    ?? null,
        grantsHalfSkills:   input.grantsHalfSkills   ?? null,
        grantsSavingThrows: input.grantsSavingThrows ?? null,
        skillChoiceCount:         input.skillChoiceCount         ?? null,
        skillChoicePool:          input.skillChoicePool          ?? null,
        savingThrowChoiceCount:   input.savingThrowChoiceCount   ?? null,
        savingThrowChoicePool:    input.savingThrowChoicePool    ?? null,
    }});
}

export async function updateClassFeature(id: string, input: {
    name?: string; description?: string | null; requiredLevel?: number; url?: string | null;
    grantsSkills?: string | null; grantsExpertise?: string | null;
    grantsHalfSkills?: string | null; grantsSavingThrows?: string | null;
    skillChoiceCount?: number | null; skillChoicePool?: string | null;
    savingThrowChoiceCount?: number | null; savingThrowChoicePool?: string | null;
}) {
    return db.dnd5eClassFeature.update({ where: { id }, data: input });
}

export async function deleteClassFeature(id: string) {
    return db.dnd5eClassFeature.delete({ where: { id } });
}

// ── Subclasses ────────────────────────────────────────────────────────────────
export async function createDnd5eSubclass(input: {
    classId: string; name: string; description?: string;
    source?: string; link?: string; sortOrder?: number;
}, actorId: string) {
    return db.dnd5eSubclass.create({ data: {
        classId:     input.classId,
        name:        input.name,
        description: input.description ?? null,
        source:      input.source      ?? null,
        link:        input.link        ?? null,
        sortOrder:   input.sortOrder   ?? 0,
    }});
}

export async function updateDnd5eSubclass(id: string, input: Partial<{
    name: string; description: string | null; source: string | null;
    link: string | null; isAvailable: boolean; sortOrder: number;
}>) {
    return db.dnd5eSubclass.update({ where: { id }, data: input });
}

export async function deleteDnd5eSubclass(id: string) {
    return db.dnd5eSubclass.delete({ where: { id } });
}

// ── Subclass Features ─────────────────────────────────────────────────────────
export async function createSubclassFeature(input: {
    subclassId: string; name: string; description?: string; requiredLevel: number; url?: string;
    grantsSkills?: string; grantsExpertise?: string; grantsHalfSkills?: string; grantsSavingThrows?: string;
    skillChoiceCount?: number | null; skillChoicePool?: string | null;
    savingThrowChoiceCount?: number | null; savingThrowChoicePool?: string | null;
}) {
    return db.dnd5eSubclassFeature.create({ data: {
        subclassId:         input.subclassId,
        name:               input.name,
        description:        input.description        ?? null,
        requiredLevel:      input.requiredLevel,
        url:                input.url                ?? null,
        grantsSkills:       input.grantsSkills       ?? null,
        grantsExpertise:    input.grantsExpertise    ?? null,
        grantsHalfSkills:   input.grantsHalfSkills   ?? null,
        grantsSavingThrows: input.grantsSavingThrows ?? null,
        skillChoiceCount:         input.skillChoiceCount         ?? null,
        skillChoicePool:          input.skillChoicePool          ?? null,
        savingThrowChoiceCount:   input.savingThrowChoiceCount   ?? null,
        savingThrowChoicePool:    input.savingThrowChoicePool    ?? null,
    }});
}

export async function updateSubclassFeature(id: string, input: {
    name?: string; description?: string | null; requiredLevel?: number; url?: string | null;
    grantsSkills?: string | null; grantsExpertise?: string | null;
    grantsHalfSkills?: string | null; grantsSavingThrows?: string | null;
    skillChoiceCount?: number | null; skillChoicePool?: string | null;
    savingThrowChoiceCount?: number | null; savingThrowChoicePool?: string | null;
}) {
    return db.dnd5eSubclassFeature.update({ where: { id }, data: input });
}

export async function updateSubclass(id: string, input: {
    name?: string; description?: string | null; canCastSpells?: boolean;
    source?: string | null; link?: string | null; sortOrder?: number;
}) {
    return db.dnd5eSubclass.update({ where: { id }, data: input });
}

export async function deleteSubclassFeature(id: string) {
    return db.dnd5eSubclassFeature.delete({ where: { id } });
}
export async function updateClassSavingThrows(classId: string, stats: string[]) {
    await db.dnd5eClassSavingThrow.deleteMany({ where: { classId } });
    if (stats.length) await db.dnd5eClassSavingThrow.createMany({ data: stats.map((stat: string) => ({ classId, stat })) });
}

export async function updateClassSkillPool(classId: string, skills: string[]) {
    await db.dnd5eClassSkillOption.deleteMany({ where: { classId } });
    if (skills.length) await db.dnd5eClassSkillOption.createMany({ data: skills.map((skill: string) => ({ classId, skill: skill as any })) });
}