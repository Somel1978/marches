// shared/database/dbapi/write/availability/slots.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';

export async function setSlots(
    userId:   string,
    date:     Date,
    slots:    number[],
    scope:    'GLOBAL' | 'WORLD',
    worldIds: string[],
) {
    if (!slots.length) return [];

    // Delete existing entries for these specific slots (any scope) before saving
    await db.availabilitySlot.deleteMany({ where: { userId, date, slot: { in: slots } } });

    const data = slots.map(slot => ({
        userId,
        date,
        slot,
        scope,
        worldIds: scope === 'GLOBAL' ? [] : worldIds,
    }));

    return db.availabilitySlot.createMany({ data, skipDuplicates: true });
}

export async function clearDay(userId: string, date: Date) {
    return db.availabilitySlot.deleteMany({ where: { userId, date } });
}

export async function clearSlot(userId: string, date: Date, slot: number) {
    return db.availabilitySlot.deleteMany({ where: { userId, date, slot } });
}

export async function clearSlots(userId: string, date: Date, slots: number[]) {
    return db.availabilitySlot.deleteMany({ where: { userId, date, slot: { in: slots } } });
}

export async function adminDeleteSlot(id: string, actorId: string) {
    const s = await db.availabilitySlot.findUnique({ where: { id } });
    if (!s) return;
    await db.availabilitySlot.delete({ where: { id } });
    await logAudit(db, { actorId, action: 'DELETE', resourceKey: 'AvailabilitySlot', resourceId: id, before: s });
}