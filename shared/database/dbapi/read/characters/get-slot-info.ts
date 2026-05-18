// shared/database/dbapi/read/characters/get-slot-info.ts
import { db } from '../../../index.ts';
import { getSettingsMap } from '../platform/get-settings.ts';

async function resolveGrantorNames(grants: { grantedBy: string }[]) {
    const ids      = [...new Set(grants.map(g => g.grantedBy))];
    const grantors = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return Object.fromEntries(grantors.map(g => [g.id, g.name]));
}

export async function getSlotInfo(userId: string) {
    const [grants, settings, characterCount] = await Promise.all([
        db.characterSlotGrant.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        getSettingsMap(),
        db.character.count({ where: { userId, status: { notIn: ['RETIRED', 'DECEASED', 'REJECTED'] as any } } }),
    ]);

    const grantorMap  = await resolveGrantorNames(grants);
    const base        = Number(settings['character.baseSlots'] ?? 3);
    const bonus       = grants.reduce((sum, g) => sum + g.delta, 0);
    const total       = base + bonus;
    const available   = total - characterCount;

    return {
        base, bonus, total, used: characterCount, available,
        grants: grants.map(g => ({ ...g, grantedByName: grantorMap[g.grantedBy] ?? g.grantedBy })),
    };
}

export async function getAllSlotInfo() {
    const [users, allGrants, settings] = await Promise.all([
        db.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
        db.characterSlotGrant.findMany({ orderBy: { createdAt: 'asc' } }),
        getSettingsMap(),
    ]);

    const base       = Number(settings['character.baseSlots'] ?? 3);
    const grantorMap = await resolveGrantorNames(allGrants);

    const charCounts = await db.character.groupBy({
        by:    ['userId'],
        where: { status: { notIn: ['RETIRED', 'DECEASED', 'REJECTED'] as any } },
        _count: { id: true },
    });
    const countMap = Object.fromEntries(charCounts.map(c => [c.userId, c._count.id]));

    return users.map(user => {
        const grants    = allGrants.filter(g => g.userId === user.id);
        const bonus     = grants.reduce((sum, g) => sum + g.delta, 0);
        const total     = base + bonus;
        const used      = countMap[user.id] ?? 0;
        const available = total - used;

        return {
            user, base, bonus, total, used, available,
            grants: grants.map(g => ({ ...g, grantedByName: grantorMap[g.grantedBy] ?? g.grantedBy })),
        };
    });
}