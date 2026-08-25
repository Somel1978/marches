// shared/database/dbapi/write/factions/npcs.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

function isUniqueViolation(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as any).code === 'P2002';
}

export type NpcInput = {
    name?:            string;
    aliases?:         string | null;
    imageUrl?:        string | null;
    locationId?:      string | null;
    factionId?:       string | null;
    rankId?:          string | null;
    factionRole?:     string | null;
    renownThreshold?: number | null;
    statBlock?:       string | null;
    mannerisms?:      string | null;
    ideals?:          string | null;
    bonds?:           string | null;
    flaws?:           string | null;
    motivation?:      string | null;
    services?:        string | null;
    secrets?:         string | null;
    bounties?:        string | null;
    status?:          string;
    isVisible?:       boolean;
};

// Faction/rank/location integrity: rank must belong to the NPC's faction;
// faction and location must belong to the NPC's world.
async function validateNpcRefs(worldId: string, input: NpcInput) {
    if (input.factionId) {
        const faction = await db.faction.findUnique({ where: { id: input.factionId }, select: { worldId: true } });
        if (!faction) throw new NotFoundError('Faction', input.factionId);
        if (faction.worldId !== worldId) throw new ValidationError('Faction belongs to a different world.');
    }
    if (input.rankId) {
        if (!input.factionId) throw new ValidationError('A rank requires a faction.');
        const rank = await db.factionRank.findUnique({ where: { id: input.rankId }, select: { factionId: true } });
        if (!rank) throw new NotFoundError('FactionRank', input.rankId);
        if (rank.factionId !== input.factionId) throw new ValidationError('Rank belongs to a different faction.');
    }
    if (input.locationId) {
        const location = await db.location.findUnique({
            where:  { id: input.locationId },
            select: { region: { select: { worldId: true } } },
        });
        if (!location) throw new NotFoundError('Location', input.locationId);
        if (location.region.worldId !== worldId) throw new ValidationError('Location belongs to a different world.');
    }
}

export async function createNpc(worldId: string, input: NpcInput & { name: string }, actorId: string) {
    if (!input.name?.trim()) throw new ValidationError('NPC name is required.');
    await validateNpcRefs(worldId, input);
    return db.$transaction(async (tx) => {
        const npc = await tx.npc.create({
            data: {
                worldId,
                name:            input.name.trim(),
                aliases:         input.aliases         ?? null,
                imageUrl:        input.imageUrl        ?? null,
                locationId:      input.locationId      ?? null,
                factionId:       input.factionId       ?? null,
                rankId:          input.rankId          ?? null,
                factionRole:     input.factionRole     ?? null,
                renownThreshold: input.renownThreshold ?? null,
                statBlock:       input.statBlock       ?? null,
                mannerisms:      input.mannerisms      ?? null,
                ideals:          input.ideals          ?? null,
                bonds:           input.bonds           ?? null,
                flaws:           input.flaws           ?? null,
                motivation:      input.motivation      ?? null,
                services:        input.services        ?? null,
                secrets:         input.secrets         ?? null,
                bounties:        input.bounties        ?? null,
                status:          (input.status as any) ?? 'ALIVE',
                isVisible:       input.isVisible       ?? false,
                createdBy:       actorId,
            },
        });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Npc', resourceId: npc.id, after: npc });
        return npc;
    });
}

export async function updateNpc(id: string, input: NpcInput, actorId: string) {
    const npc = await db.npc.findUnique({ where: { id } });
    if (!npc) throw new NotFoundError('Npc', id);

    // Resolve effective faction for rank validation (input may clear or keep)
    const effective: NpcInput = {
        ...input,
        factionId:  input.factionId  !== undefined ? input.factionId  : npc.factionId,
        rankId:     input.rankId     !== undefined ? input.rankId     : npc.rankId,
        locationId: input.locationId !== undefined ? input.locationId : npc.locationId,
    };
    await validateNpcRefs(npc.worldId, effective);

    const data: any = { ...input };
    if (input.name !== undefined) {
        if (!input.name.trim()) throw new ValidationError('NPC name is required.');
        data.name = input.name.trim();
    }
    if (input.status !== undefined) data.status = input.status as any;
    // Clearing the faction always clears the rank
    if (input.factionId === null) data.rankId = null;

    return db.$transaction(async (tx) => {
        const updated = await tx.npc.update({ where: { id }, data });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Npc', resourceId: id, before: npc, after: updated });
        return updated;
    });
}

export async function deleteNpc(id: string, actorId: string) {
    const npc = await db.npc.findUnique({ where: { id } });
    if (!npc) throw new NotFoundError('Npc', id);
    return db.$transaction(async (tx) => {
        await tx.npc.delete({ where: { id } }); // cascades NpcQuest links
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Npc', resourceId: id, before: npc });
        return npc;
    });
}

// ── Plot quest links ──────────────────────────────────────────────────────────

export async function addNpcQuest(npcId: string, plotQuestId: string, actorId: string) {
    const npc = await db.npc.findUnique({ where: { id: npcId }, select: { id: true, worldId: true } });
    if (!npc) throw new NotFoundError('Npc', npcId);
    const plot = await db.plotQuest.findFirst({
        where: { id: plotQuestId, worldId: npc.worldId },
        select: { id: true },
    });
    if (!plot) throw new NotFoundError('PlotQuest', plotQuestId);
    try {
        return await db.$transaction(async (tx) => {
            const link = await tx.npcQuest.create({ data: { npcId, plotQuestId } });
            await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Npc', resourceId: npcId, after: link, metadata: { entity: 'NpcQuest' } });
            return link;
        });
    } catch (e) {
        if (typeof e === 'object' && e !== null && (e as any).code === 'P2002') {
            throw new ValidationError('This plot quest is already linked to the NPC.');
        }
        throw e;
    }
}

export async function removeNpcQuest(id: string, actorId: string) {
    const link = await db.npcQuest.findUnique({ where: { id } });
    if (!link) throw new NotFoundError('NpcQuest', id);
    return db.$transaction(async (tx) => {
        await tx.npcQuest.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'Npc', resourceId: link.npcId, before: link, metadata: { entity: 'NpcQuest' } });
        return link;
    });
}
