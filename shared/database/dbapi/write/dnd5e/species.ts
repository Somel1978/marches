// shared/database/dbapi/write/dnd5e/species.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

// ── Species ───────────────────────────────────────────────────────────────────
export async function createDnd5eSpecies(input: {
    gameSystemId: string; name: string; description?: string; source?: string;
    link?: string; isSubrace?: boolean; isLegacy?: boolean; sortOrder?: number;
}, actorId: string) {
    const s = await db.dnd5eSpecies.create({ data: {
        gameSystemId: input.gameSystemId,
        name:         input.name,
        description:  input.description ?? null,
        source:       input.source      ?? null,
        link:         input.link        ?? null,
        isSubrace:    input.isSubrace   ?? false,
        isLegacy:     input.isLegacy    ?? false,
        sortOrder:    input.sortOrder   ?? 0,
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: s.id, after: s });
    return s;
}

export async function updateDnd5eSpecies(id: string, input: Partial<{
    name: string; description: string | null; source: string | null; link: string | null;
    isSubrace: boolean; isLegacy: boolean; isAvailable: boolean; sortOrder: number;
}>, actorId: string) {
    const before = await db.dnd5eSpecies.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eSpecies', id);
    const s = await db.dnd5eSpecies.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: id, before, after: s });
    return s;
}

export async function deleteDnd5eSpecies(id: string, actorId: string) {
    const before = await db.dnd5eSpecies.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eSpecies', id);
    await db.dnd5eSpecies.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: id, before });
}

// ── Species Traits ────────────────────────────────────────────────────────────
export async function createSpeciesTrait(input: {
    speciesId: string; name: string; description?: string; requiredLevel?: number;
}) {
    return db.dnd5eSpeciesTrait.create({ data: {
        speciesId:     input.speciesId,
        name:          input.name,
        description:   input.description  ?? null,
        requiredLevel: input.requiredLevel ?? null,
    }});
}

export async function updateSpeciesTrait(id: string, input: {
    name?: string; description?: string | null; requiredLevel?: number | null;
}) {
    return db.dnd5eSpeciesTrait.update({ where: { id }, data: input });
}

export async function deleteSpeciesTrait(id: string) {
    return db.dnd5eSpeciesTrait.delete({ where: { id } });
}

// ── Backgrounds ───────────────────────────────────────────────────────────────
export async function createDnd5eBackground(input: {
    gameSystemId: string; name: string; shortDescription?: string;
    featureName?: string; skillProficiencies?: string; toolProficiencies?: string;
    languages?: string; url?: string; sortOrder?: number;
    grantsFeatCategory?: string; grantsFeatId?: string;
}, actorId: string) {
    const b = await db.dnd5eBackground.create({ data: {
        gameSystemId:       input.gameSystemId,
        name:               input.name,
        shortDescription:   input.shortDescription   ?? null,
        featureName:        input.featureName         ?? null,
        skillProficiencies: input.skillProficiencies  ?? null,
        toolProficiencies:  input.toolProficiencies   ?? null,
        languages:          input.languages            ?? null,
        url:                input.url                  ?? null,
        sortOrder:          input.sortOrder            ?? 0,
        grantsFeatCategory: input.grantsFeatCategory  ?? null,
        grantsFeatId:       input.grantsFeatId         ?? null,
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: b.id, after: b });
    return b;
}

export async function updateDnd5eBackground(id: string, input: Partial<{
    name: string; shortDescription: string | null; featureName: string | null;
    skillProficiencies: string | null; toolProficiencies: string | null;
    languages: string | null; url: string | null; isAvailable: boolean; sortOrder: number;
    grantsFeatCategory: string | null; grantsFeatId: string | null;
}>, actorId: string) {
    const before = await db.dnd5eBackground.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eBackground', id);
    const b = await db.dnd5eBackground.update({ where: { id }, data: input });
    await logAudit(db, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: id, before, after: b });
    return b;
}

export async function deleteDnd5eBackground(id: string, actorId: string) {
    const before = await db.dnd5eBackground.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Dnd5eBackground', id);
    await db.dnd5eBackground.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: id, before });
}