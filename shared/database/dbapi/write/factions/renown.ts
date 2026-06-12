// shared/database/dbapi/write/factions/renown.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

// Renown is per CHARACTER per faction: -10 (hostile) .. 0 (neutral) .. +10 (favored).
// No row = neutral. Set by canManage DMs or admins only — enforced at route level.

function clampRenown(value: number): number {
    if (!Number.isFinite(value)) throw new ValidationError('Renown must be a number between -10 and 10.');
    return Math.max(-10, Math.min(10, Math.round(value)));
}

export async function setFactionRenown(
    factionId:   string,
    characterId: string,
    value:       number,
    note:        string | null,
    actorId:     string,
) {
    const clamped = clampRenown(value);

    const [faction, character] = await Promise.all([
        db.faction.findUnique({   where: { id: factionId },   select: { id: true, worldId: true } }),
        db.character.findUnique({ where: { id: characterId }, select: { id: true } }),
    ]);
    if (!faction)   throw new NotFoundError('Faction', factionId);
    if (!character) throw new NotFoundError('Character', characterId);

    return db.$transaction(async (tx) => {
        const before = await tx.factionRenown.findUnique({
            where: { factionId_characterId: { factionId, characterId } },
        });
        const renown = await tx.factionRenown.upsert({
            where:  { factionId_characterId: { factionId, characterId } },
            create: { factionId, characterId, value: clamped, note: note ?? null, updatedBy: actorId },
            update: { value: clamped, note: note ?? null, updatedBy: actorId },
        });
        await logAudit(tx, {
            actorId,
            action:      before ? 'UPDATE' : 'CREATE',
            resourceKey: 'Faction',
            resourceId:  factionId,
            before:      before ?? undefined,
            after:       renown,
            metadata:    { entity: 'FactionRenown', characterId },
        });
        return renown;
    });
}

// Remove the row entirely — character reverts to neutral (0).
export async function removeFactionRenown(factionId: string, characterId: string, actorId: string) {
    const renown = await db.factionRenown.findUnique({
        where: { factionId_characterId: { factionId, characterId } },
    });
    if (!renown) throw new NotFoundError('FactionRenown', `${factionId}/${characterId}`);
    return db.$transaction(async (tx) => {
        await tx.factionRenown.delete({ where: { id: renown.id } });
        await logAudit(tx, {
            actorId,
            action:      'DELETE',
            resourceKey: 'Faction',
            resourceId:  factionId,
            before:      renown,
            metadata:    { entity: 'FactionRenown', characterId },
        });
        return renown;
    });
}
