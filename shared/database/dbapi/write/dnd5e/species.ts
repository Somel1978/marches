// shared/database/dbapi/write/dnd5e/species.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

// ── Species ───────────────────────────────────────────────────────────────────

export async function createDnd5eSpecies(input: {
    gameSystemId: string; name: string; uploadId?: string; description?: string; source?: string;
    link?: string; isSubrace?: boolean; isLegacy?: boolean; sortOrder?: number;
}, actorId: string) {
    const s = await db.dnd5eSpecies.create({ data: {
        gameSystemId: input.gameSystemId,
        name:         input.name,
        uploadId:     input.uploadId     ?? null,
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
    uploadId: string | null; name: string; description: string | null; source: string | null; link: string | null;
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

// ── Species Trait Speeds ──────────────────────────────────────────────────────
// Delete-and-recreate per trait — replaces all speed rows for that trait.

export async function updateSpeciesTraitSpeeds(
    traitId: string,
    speeds: { movementType: string; speed: number }[],
) {
    await db.dnd5eSpeciesTraitSpeed.deleteMany({ where: { traitId } });
    if (!speeds.length) return;
    await db.dnd5eSpeciesTraitSpeed.createMany({
        data: speeds.map(s => ({
            traitId,
            movementType: s.movementType.toUpperCase(),
            speed:        s.speed,
        })),
    });
}

// ── Species Traits ────────────────────────────────────────────────────────────

const TRAIT_GRANT_FIELDS = [
    'grantsSkills', 'grantsExpertise', 'expertiseChoiceCount', 'expertiseChoicePool', 'grantsHalfSkills',
    'skillChoiceCount', 'skillChoicePool',
    'savingThrowChoiceCount', 'savingThrowChoicePool',
    'grantsTools', 'toolChoiceCount', 'toolChoicePool',
    'grantsLanguages', 'languageChoiceCount', 'languageChoicePool',
    'grantsResistances', 'grantsImmunities', 'grantsVulnerabilities',
    'grantsInnateSpells',
    'size', 'sizeChoices', 'senses',
] as const;

type TraitGrantInput = Partial<{
    grantsSkills: string | null; grantsExpertise: string | null; expertiseChoiceCount: number | null; expertiseChoicePool: string | null; grantsHalfSkills: string | null;
    skillChoiceCount: number | null; skillChoicePool: string | null;
    savingThrowChoiceCount: number | null; savingThrowChoicePool: string | null;
    grantsTools: string | null; toolChoiceCount: number | null; toolChoicePool: string | null;
    grantsLanguages: string | null; languageChoiceCount: number | null; languageChoicePool: string | null;
    grantsResistances: string | null; grantsImmunities: string | null; grantsVulnerabilities: string | null;
    grantsInnateSpells: string | null;
    size: string | null; sizeChoices: string | null; senses: string | null;
}>;

export async function createSpeciesTrait(input: {
    speciesId: string; name: string; uploadId?: string; description?: string; requiredLevel?: number;
} & TraitGrantInput) {
    return db.dnd5eSpeciesTrait.create({ data: {
        speciesId:       input.speciesId,
        name:            input.name,
        uploadId:        input.uploadId      ?? null,
        description:     input.description   ?? null,
        requiredLevel:   input.requiredLevel  ?? null,
        ...Object.fromEntries(TRAIT_GRANT_FIELDS.map(f => [f, (input as any)[f] ?? null])),
    }});
}

export async function updateSpeciesTrait(id: string, input: {
    uploadId?: string | null; name?: string; description?: string | null; requiredLevel?: number | null;
} & TraitGrantInput) {
    return db.dnd5eSpeciesTrait.update({ where: { id }, data: input });
}

export async function deleteSpeciesTrait(id: string) {
    return db.dnd5eSpeciesTrait.delete({ where: { id } });
}

// ── Backgrounds ───────────────────────────────────────────────────────────────

type BackgroundGrantInput = Partial<{
    grantsSkills: string | null; skillChoiceCount: number | null; skillChoicePool: string | null;
    savingThrowChoiceCount: number | null; savingThrowChoicePool: string | null;
    grantsTools: string | null; toolChoiceCount: number | null; toolChoicePool: string | null;
    grantsLanguages: string | null; languageChoiceCount: number | null; languageChoicePool: string | null;
    grantsResistances: string | null; grantsImmunities: string | null; grantsVulnerabilities: string | null;
    grantsInnateSpells: string | null;
    grantsSpeed: string | null;
    grantsSenses: string | null;
}>;

export async function createDnd5eBackground(input: {
    gameSystemId: string; name: string; uploadId?: string; shortDescription?: string;
    featureName?: string; url?: string; sortOrder?: number;
    grantsFeatCategory?: string; grantsFeatId?: string;
    toolProficiencies?: string; languages?: string;
} & BackgroundGrantInput, actorId: string) {
    const b = await db.dnd5eBackground.create({ data: {
        gameSystemId:       input.gameSystemId,
        name:               input.name,
        uploadId:           input.uploadId           ?? null,
        shortDescription:   input.shortDescription  ?? null,
        featureName:        input.featureName        ?? null,
        url:                input.url                ?? null,
        sortOrder:          input.sortOrder          ?? 0,
        grantsFeatCategory: input.grantsFeatCategory ?? null,
        grantsFeatId:       input.grantsFeatId       ?? null,
        toolProficiencies:  input.toolProficiencies  ?? null,
        languages:          input.languages           ?? null,
        grantsSkills:            input.grantsSkills            ?? null,
        skillChoiceCount:        input.skillChoiceCount        ?? null,
        skillChoicePool:         input.skillChoicePool         ?? null,
        savingThrowChoiceCount:  input.savingThrowChoiceCount  ?? null,
        savingThrowChoicePool:   input.savingThrowChoicePool   ?? null,
        grantsTools:             input.grantsTools             ?? null,
        toolChoiceCount:         input.toolChoiceCount         ?? null,
        toolChoicePool:          input.toolChoicePool          ?? null,
        grantsLanguages:         input.grantsLanguages         ?? null,
        languageChoiceCount:     input.languageChoiceCount     ?? null,
        languageChoicePool:      input.languageChoicePool      ?? null,
        grantsResistances:       input.grantsResistances       ?? null,
        grantsImmunities:        input.grantsImmunities        ?? null,
        grantsVulnerabilities:   input.grantsVulnerabilities   ?? null,
        grantsInnateSpells:      input.grantsInnateSpells      ?? null,
        grantsSpeed:             input.grantsSpeed             ?? null,
        grantsSenses:            input.grantsSenses            ?? null,
    }});
    await logAudit(db, { actorId, action: 'CREATE', resourceKey: 'GameSystem', resourceId: b.id, after: b });
    return b;
}

export async function updateDnd5eBackground(id: string, input: Partial<{
    uploadId: string | null; name: string; shortDescription: string | null; featureName: string | null;
    url: string | null; isAvailable: boolean; sortOrder: number;
    grantsFeatCategory: string | null; grantsFeatId: string | null;
    toolProficiencies: string | null; languages: string | null;
} & BackgroundGrantInput>, actorId: string) {
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