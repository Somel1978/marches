// shared/database/dbapi/read/availability/get-availability.ts
import { db } from '../../../index.ts';

// Get all slots for a user within a date range
export async function getUserAvailability(userId: string, from: Date, to: Date) {
    return db.availabilitySlot.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    });
}

// Get available characters for a quest date/time + worldId
// Returns userId list whose owners are available
export async function getAvailableUsersForQuest(
    date:    Date,
    slot:    number,   // 0-47
    worldId: string | null,
) {
    const where: any = { date, slot };
    if (worldId) {
        where.OR = [
            { scope: 'GLOBAL' },
            { scope: 'WORLD', worldIds: { has: worldId } },
        ];
    } else {
        where.scope = 'GLOBAL';
    }
    return db.availabilitySlot.findMany({ where, select: { userId: true } });
}

// Admin: get all slots for a date range (all users)
export async function getAllAvailability(from: Date, to: Date) {
    return db.availabilitySlot.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    });
}
