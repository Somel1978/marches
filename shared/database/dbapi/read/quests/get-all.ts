// shared/database/dbapi/read/quests/get-all.ts
import { db } from '../../../index.ts';

export type GetAllQuestsOptions = {
    status?:      string;
    dmProfileId?: string;
    page?:        number;
    perPage?:     number;
};

export async function getAllQuests({
    status, dmProfileId, page = 1, perPage = 20,
}: GetAllQuestsOptions = {}) {
    const where = {
        ...(status      && { status: status as any }),
        ...(dmProfileId && { dmProfileId }),
    };

    const [items, total] = await db.$transaction([
        db.quest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
            include: {
                rewards:  true,
                signups:  { where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } } },
                coDMs:    true,
            },
        }),
        db.quest.count({ where }),
    ]);

    // Enrich with DM user names
    const dmIds  = [...new Set(items.map(q => q.dmProfileId))];
    const dmProfiles = await db.dMProfile.findMany({ where: { id: { in: dmIds } } });
    const dmUserIds  = dmProfiles.map(p => p.userId);
    const dmUsers    = await db.user.findMany({ where: { id: { in: dmUserIds } }, select: { id: true, name: true } });
    const userMap    = Object.fromEntries(dmUsers.map(u => [u.id, u.name]));
    const profileMap = Object.fromEntries(dmProfiles.map(p => [p.id, userMap[p.userId] ?? p.userId]));

    return {
        items: items.map(q => ({ ...q, dmName: profileMap[q.dmProfileId] ?? q.dmProfileId })),
        total, page, perPage, totalPages: Math.ceil(total / perPage),
    };
}
