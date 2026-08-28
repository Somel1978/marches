// shared/database/dbapi/write/world/worlds.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

function toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createWorld(
    input: { name: string; description?: string; mapImageUrl?: string },
    actorId: string,
) {
    const slug = toSlug(input.name);
    return db.$transaction(async (tx) => {
        const world = await tx.world.create({
            data: { name: input.name, slug, description: input.description ?? null, mapImageUrl: input.mapImageUrl ?? null },
        });
        // Auto-create Tavern channel for this world
        await tx.tavernChannel.create({
            data: { worldId: world.id, name: world.name },
        });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'World', resourceId: world.id, after: world });
        return world;
    });
}

export async function updateWorld(
    id: string,
    input: {
        name?: string; description?: string | null; mapImageUrl?: string | null;
        isActive?: boolean; acceptsGlobalCharacters?: boolean;
        /** null = inherit the game system default */
        progressionMode?: 'XP' | 'MILESTONE' | null;
    },
    actorId: string,
) {
    const world = await db.world.findUnique({ where: { id } });
    if (!world) throw new NotFoundError('World', id);
    return db.$transaction(async (tx) => {
        const updated = await tx.world.update({ where: { id }, data: input });
        // Keep the world's tavern channel name in sync — it's created once
        // from the world name (see ensureWorldTavernChannel) but has no
        // other sync point, so a later rename silently left the channel
        // showing the old name until this was added. updateMany (not
        // update) deliberately: worldId is unique on TavernChannel, but a
        // world can exist without a channel yet in a race with
        // ensureWorldTavernChannel — updateMany no-ops instead of throwing
        // if there's nothing to update, so a missing channel never blocks
        // the world rename itself.
        if (input.name && input.name !== world.name) {
            await tx.tavernChannel.updateMany({ where: { worldId: id }, data: { name: input.name } });
        }
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'World', resourceId: id, before: world, after: updated });
        return updated;
    });
}

export async function createRegion(
    input: {
        worldId:      string;
        name:         string;
        description?: string;
        mapX?:        number;
        mapY?:        number;
        color?:       string;
        minLevel?:    number;
        maxLevel?:    number;
        dangerRating?: string;
        imageUrl?:    string;
    },
    actorId: string,
) {
    const slug = toSlug(input.name);
    return db.$transaction(async (tx) => {
        const region = await tx.region.create({
            data: {
                worldId:      input.worldId,
                name:         input.name,
                slug,
                description:  input.description  ?? null,
                mapX:         input.mapX          ?? null,
                mapY:         input.mapY          ?? null,
                color:        input.color         ?? '#6366f1',
                minLevel:     input.minLevel      ?? null,
                maxLevel:     input.maxLevel      ?? null,
                dangerRating: (input.dangerRating as any) ?? 'Safe',
                imageUrl:     input.imageUrl      ?? null,
            },
        });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Region', resourceId: region.id, after: region });
        return region;
    });
}

export async function updateRegion(
    id: string,
    input: {
        name?:         string;
        description?:  string | null;
        mapX?:         number | null;
        mapY?:         number | null;
        color?:        string;
        minLevel?:     number | null;
        maxLevel?:     number | null;
        dangerRating?: string;
        isActive?:     boolean;
        imageUrl?:     string | null;
    },
    actorId: string,
) {
    const region = await db.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundError('Region', id);
    return db.$transaction(async (tx) => {
        const data: any = { ...input };
        if (input.dangerRating) data.dangerRating = input.dangerRating as any;
        const updated = await tx.region.update({ where: { id }, data });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Region', resourceId: id, before: region, after: updated });
        return updated;
    });
}

export async function assignDMToWorld(worldId: string, dmProfileId: string, actorId: string, canManage = false) {
    const existing = await db.worldDM.findUnique({ where: { worldId_dmProfileId: { worldId, dmProfileId } } });
    if (existing) throw new ValidationError('DM already assigned to this world.');
    return db.worldDM.create({ data: { worldId, dmProfileId, canManage, assignedBy: actorId } });
}

export async function updateWorldDMPermission(worldId: string, dmProfileId: string, canManage: boolean) {
    return db.worldDM.update({
        where: { worldId_dmProfileId: { worldId, dmProfileId } },
        data:  { canManage },
    });
}

export async function removeDMFromWorld(worldId: string, dmProfileId: string, actorId: string) {
    return db.worldDM.delete({ where: { worldId_dmProfileId: { worldId, dmProfileId } } });
}

export async function assignDMToRegion(regionId: string, dmProfileId: string, actorId: string) {
    const existing = await db.regionDM.findUnique({ where: { regionId_dmProfileId: { regionId, dmProfileId } } });
    if (existing) throw new ValidationError('DM already assigned to this region.');
    return db.regionDM.create({ data: { regionId, dmProfileId, assignedBy: actorId } });
}

export async function removeDMFromRegion(regionId: string, dmProfileId: string, actorId: string) {
    return db.regionDM.delete({ where: { regionId_dmProfileId: { regionId, dmProfileId } } });
}

export async function createLocation(
    input: {
        regionId:     string;
        name:         string;
        description?: string;
        type?:        string;
        minLevel?:    number;
        maxLevel?:    number;
        dangerRating?: string;
        imageUrl?:    string;
    },
    actorId: string,
) {
    const slug = toSlug(input.name);
    return db.$transaction(async (tx) => {
        const loc = await tx.location.create({
            data: {
                regionId:     input.regionId,
                name:         input.name,
                slug,
                description:  input.description  ?? null,
                type:         (input.type as any) ?? 'Other',
                minLevel:     input.minLevel      ?? null,
                maxLevel:     input.maxLevel      ?? null,
                dangerRating: (input.dangerRating as any) ?? 'Safe',
                imageUrl:     input.imageUrl      ?? null,
            },
        });
        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Location', resourceId: loc.id, after: loc });
        return loc;
    });
}

export async function updateLocation(
    id: string,
    input: {
        name?:         string;
        description?:  string | null;
        type?:         string;
        minLevel?:     number | null;
        maxLevel?:     number | null;
        dangerRating?: string;
        isActive?:     boolean;
        imageUrl?:     string | null;
    },
    actorId: string,
) {
    const loc = await db.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundError('Location', id);
    return db.$transaction(async (tx) => {
        const data: any = { ...input };
        if (input.type)         data.type         = input.type as any;
        if (input.dangerRating) data.dangerRating  = input.dangerRating as any;
        const updated = await tx.location.update({ where: { id }, data });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'Location', resourceId: id, before: loc, after: updated });
        return updated;
    });
}