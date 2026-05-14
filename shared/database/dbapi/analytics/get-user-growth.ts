// shared/database/dbapi/analytics/get-user-growth.ts
import { db } from '../../index.ts';

export type UserGrowthPoint = {
    date:  string;   // YYYY-MM-DD
    count: number;   // new users that day
    total: number;   // cumulative total
};

// Daily user registration counts for the last N days.
// Uses raw SQL for date_trunc grouping — Prisma ORM does not support this natively.
export async function getUserGrowth(days = 30): Promise<UserGrowthPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS date, COUNT(*) AS count
        FROM users.users
        WHERE created_at >= ${since}
        GROUP BY date_trunc('day', created_at)
        ORDER BY date ASC
    `;

    const totalBefore = await db.user.count({ where: { createdAt: { lt: since } } });

    let running = totalBefore;
    return rows.map(row => {
        running += Number(row.count);
        return { date: row.date.toISOString().split('T')[0], count: Number(row.count), total: running };
    });
}
