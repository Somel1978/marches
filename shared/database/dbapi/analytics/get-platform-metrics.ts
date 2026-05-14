// shared/database/dbapi/analytics/get-platform-metrics.ts
import { db } from '../../index.ts';

export type PlatformMetrics = {
    totalUsers:     number;
    totalRoles:     number;
    totalResources: number;
    activeSessions: number;
};

// Single-query platform overview for the admin dashboard.
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
    const [totalUsers, totalRoles, totalResources, activeSessions] =
        await db.$transaction([
            db.user.count(),
            db.role.count(),
            db.resource.count(),
            db.session.count({ where: { expiresAt: { gt: new Date() } } }),
        ]);

    return { totalUsers, totalRoles, totalResources, activeSessions };
}
