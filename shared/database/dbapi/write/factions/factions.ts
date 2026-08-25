// shared/database/dbapi/write/factions/factions.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

function toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isUniqueViolation(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as any).code === 'P2002';
}

export type FactionInput = {
    name?:           string;
    designation?:    string | null;
    heraldryUrl?:    string | null;
    primaryColors?:  string | null;
    motto?:          string | null;
    powerTier?:      string;
    lore?:           string | null;
    ideals?:         string | null;
    taboos?:         string | null;
    inductionHooks?: string | null;
    secrets?:        string | null;
    bounties?:       string | null;
    isVisible?:      boolean;
};

export async function createFaction(worldId: string, input: FactionInput & { name: string }, actorId: string) {
    const slug = toSlug(input.name);
    if (!slug) throw new ValidationError('Faction name is required.');
    try {
        return await db.$transaction(async (tx) => {
            const faction = await tx.faction.create({
                data: {
                    worldId,
                    name:           input.name,
                    slug,
                    designation:    input.designation    ?? null,
                    heraldryUrl:    input.heraldryUrl    ?? null,
                    primaryColors:  input.primaryColors  ?? null,
                    motto:          input.motto          ?? null,
                    powerTier:      (input.powerTier as any) ?? 'LOCAL',
                    lore:           input.lore           ?? null,
                    ideals:         input.ideals         ?? null,
                    taboos:         input.taboos         ?? null,
                    inductionHooks: input.inductionHooks ?? null,
                    secrets:        input.secrets        ?? null,
                    bounties:       input.bounties       ?? null,
                    isVisible:      input.isVisible      ?? true,
                    createdBy:      actorId,
                },
            });
            await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Faction', resourceId: faction.id, after: faction });
            return faction;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('A faction with this name already exists in this world.');
        throw e;
    }
}

export async function updateFaction(id: string, input: FactionInput, actorId: string) {
    const faction = await db.faction.findUnique({ where: { id } });
    if (!faction) throw new NotFoundError('Faction', id);

    const data: any = { ...input };
    if (input.name !== undefined) {
        const slug = toSlug(input.name);
        if (!slug) throw new ValidationError('Faction name is required.');
        data.slug = slug;
    }
    if (input.powerTier !== undefined) data.powerTier = input.powerTier as any;

    try {
        return await db.$transaction(async (tx) => {
            const updated = await tx.faction.update({ where: { id }, data });
            await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Faction', resourceId: id, before: faction, after: updated });
            return updated;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('A faction with this name already exists in this world.');
        throw e;
    }
}

export async function deleteFaction(id: string, actorId: string) {
    const faction = await db.faction.findUnique({ where: { id } });
    if (!faction) throw new NotFoundError('Faction', id);
    return db.$transaction(async (tx) => {
        await tx.faction.delete({ where: { id } }); // cascades ranks/territories/relations/renown/links; NPCs SetNull
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Faction', resourceId: id, before: faction });
        return faction;
    });
}

// ── Ranks ─────────────────────────────────────────────────────────────────────

export async function createFactionRank(
    factionId: string,
    input: { name: string; level?: number; description?: string | null; renownRequired?: number | null },
    actorId: string,
) {
    try {
        return await db.$transaction(async (tx) => {
            const rank = await tx.factionRank.create({
                data: {
                    factionId,
                    name:           input.name,
                    level:          input.level ?? 1,
                    description:    input.description    ?? null,
                    renownRequired: input.renownRequired ?? null,
                },
            });
            await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Faction', resourceId: factionId, after: rank, metadata: { entity: 'FactionRank' } });
            return rank;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('A rank with this name already exists in this faction.');
        throw e;
    }
}

export async function updateFactionRank(
    id: string,
    input: { name?: string; level?: number; description?: string | null; renownRequired?: number | null },
    actorId: string,
) {
    const rank = await db.factionRank.findUnique({ where: { id } });
    if (!rank) throw new NotFoundError('FactionRank', id);
    try {
        return await db.$transaction(async (tx) => {
            const updated = await tx.factionRank.update({ where: { id }, data: input });
            await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Faction', resourceId: rank.factionId, before: rank, after: updated, metadata: { entity: 'FactionRank' } });
            return updated;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('A rank with this name already exists in this faction.');
        throw e;
    }
}

export async function deleteFactionRank(id: string, actorId: string) {
    const rank = await db.factionRank.findUnique({ where: { id } });
    if (!rank) throw new NotFoundError('FactionRank', id);
    return db.$transaction(async (tx) => {
        await tx.factionRank.delete({ where: { id } }); // NPCs holding this rank → rankId SetNull
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Faction', resourceId: rank.factionId, before: rank, metadata: { entity: 'FactionRank' } });
        return rank;
    });
}

// ── Territories ───────────────────────────────────────────────────────────────

export async function addFactionTerritory(
    factionId: string,
    input: { entityType: 'REGION' | 'LOCATION'; entityId: string; notes?: string | null },
    actorId: string,
) {
    try {
        return await db.$transaction(async (tx) => {
            const territory = await tx.factionTerritory.create({
                data: { factionId, entityType: input.entityType, entityId: input.entityId, notes: input.notes ?? null },
            });
            await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Faction', resourceId: factionId, after: territory, metadata: { entity: 'FactionTerritory' } });
            return territory;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('This territory is already linked to the faction.');
        throw e;
    }
}

export async function removeFactionTerritory(id: string, actorId: string) {
    const territory = await db.factionTerritory.findUnique({ where: { id } });
    if (!territory) throw new NotFoundError('FactionTerritory', id);
    return db.$transaction(async (tx) => {
        await tx.factionTerritory.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Faction', resourceId: territory.factionId, before: territory, metadata: { entity: 'FactionTerritory' } });
        return territory;
    });
}

// ── Relations (rivalries / alliances) ─────────────────────────────────────────

export async function setFactionRelation(
    factionId: string,
    targetFactionId: string,
    input: { type: 'RIVAL' | 'ALLY'; notes?: string | null },
    actorId: string,
) {
    if (factionId === targetFactionId) throw new ValidationError('A faction cannot have a relation with itself.');

    // Both factions must belong to the same world
    const [a, b] = await Promise.all([
        db.faction.findUnique({ where: { id: factionId },       select: { worldId: true } }),
        db.faction.findUnique({ where: { id: targetFactionId }, select: { worldId: true } }),
    ]);
    if (!a) throw new NotFoundError('Faction', factionId);
    if (!b) throw new NotFoundError('Faction', targetFactionId);
    if (a.worldId !== b.worldId) throw new ValidationError('Factions must belong to the same world.');

    return db.$transaction(async (tx) => {
        // One relation per pair, regardless of direction — clear any reverse row first
        await tx.factionRelation.deleteMany({ where: { factionId: targetFactionId, targetFactionId: factionId } });
        const relation = await tx.factionRelation.upsert({
            where:  { factionId_targetFactionId: { factionId, targetFactionId } },
            create: { factionId, targetFactionId, type: input.type as any, notes: input.notes ?? null },
            update: { type: input.type as any, notes: input.notes ?? null },
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Faction', resourceId: factionId, after: relation, metadata: { entity: 'FactionRelation' } });
        return relation;
    });
}

export async function removeFactionRelation(id: string, actorId: string) {
    const relation = await db.factionRelation.findUnique({ where: { id } });
    if (!relation) throw new NotFoundError('FactionRelation', id);
    return db.$transaction(async (tx) => {
        await tx.factionRelation.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Faction', resourceId: relation.factionId, before: relation, metadata: { entity: 'FactionRelation' } });
        return relation;
    });
}

// ── Plot quest links ──────────────────────────────────────────────────────────

export async function addFactionQuest(factionId: string, plotQuestId: string, actorId: string) {
    const faction = await db.faction.findUnique({ where: { id: factionId }, select: { id: true, worldId: true } });
    if (!faction) throw new NotFoundError('Faction', factionId);
    const plot = await db.plotQuest.findFirst({
        where: { id: plotQuestId, worldId: faction.worldId },
        select: { id: true },
    });
    if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
    try {
        return await db.$transaction(async (tx) => {
            const link = await tx.factionQuest.create({ data: { factionId, plotQuestId } });
            await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Faction', resourceId: factionId, after: link, metadata: { entity: 'FactionQuest' } });
            return link;
        });
    } catch (e) {
        if (isUniqueViolation(e)) throw new ValidationError('This plot quest is already linked to the faction.');
        throw e;
    }
}

export async function removeFactionQuest(id: string, actorId: string) {
    const link = await db.factionQuest.findUnique({ where: { id } });
    if (!link) throw new NotFoundError('FactionQuest', id);
    return db.$transaction(async (tx) => {
        await tx.factionQuest.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Faction', resourceId: link.factionId, before: link, metadata: { entity: 'FactionQuest' } });
        return link;
    });
}
