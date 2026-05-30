// shared/database/dbapi/read/audit/get-logs.ts
import { db } from '../../../index.ts';

export type GetAuditLogsOptions = {
    resourceKey?: string;
    resourceId?:  string;
    action?:      string;
    actorId?:     string;
    from?:        Date;
    to?:          Date;
    page?:        number;
    perPage?:     number;
};

export async function getAuditLogs({
    resourceKey,
    resourceId,
    action,
    actorId,
    from,
    to,
    page    = 1,
    perPage = 50,
}: GetAuditLogsOptions = {}) {
    const createdAt = (from || to) ? {
        ...(from ? { gte: from } : {}),
        ...(to   ? { lte: to   } : {}),
    } : undefined;

    const where = {
        ...(resourceKey              && { resourceKey }),
        ...(resourceId               && { resourceId }),
        ...(action                   && { action: action as any }),
        ...(actorId                  && { actorId }),
        ...(createdAt                && { createdAt }),
    };

    const [items, total] = await db.$transaction([
        db.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip:    (page - 1) * perPage,
            take:    perPage,
            include: {
                actor: {
                    select: { id: true, name: true, email: true },
                },
            },
        }),
        db.auditLog.count({ where }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}