// shared/database/dbapi/read/stats/get-stats.ts
import { Prisma } from '@prisma/client';
import { db } from '../../../index.ts';

// ── Platform-wide stats ───────────────────────────────────────────────────────
export async function getPlatformStats() {
    const [
        totalUsers, totalCharacters, totalWorlds,
        questsByStatus, recentCompletions,
        salesStats, purchaseStats,
    ] = await Promise.all([
        db.user.count(),
        db.character.count(),
        db.world.count(),
        db.quest.groupBy({ by: ['status'], _count: { id: true } }),
        // Quests completed per month (last 6 months)
        db.$queryRaw<{ month: string; count: bigint }[]>`
            SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month, COUNT(*)::bigint AS count
            FROM quests.quests
            WHERE status = 'COMPLETED' AND updated_at >= NOW() - INTERVAL '6 months'
            GROUP BY month ORDER BY month ASC`,
        // Sales stats
        db.marketplaceTransaction.aggregate({
            where: { type: 'SELL', status: 'APPROVED' },
            _sum: { totalPrice: true }, _avg: { totalPrice: true }, _count: { id: true },
        }),
        // Purchase stats
        db.marketplaceTransaction.aggregate({
            where: { type: 'BUY', status: 'APPROVED' },
            _sum: { totalPrice: true }, _avg: { totalPrice: true }, _count: { id: true },
        }),
    ]);

    const statusMap = Object.fromEntries(questsByStatus.map(q => [q.status, q._count.id]));

    return {
        totalUsers,
        totalCharacters,
        totalWorlds,
        questsByStatus: statusMap,
        completedPerMonth: recentCompletions.map(r => ({ month: r.month, count: Number(r.count) })),
        sales: {
            total:   salesStats._sum.totalPrice    ?? 0,
            average: salesStats._avg.totalPrice    ?? 0,
            count:   salesStats._count.id,
        },
        purchases: {
            total:   purchaseStats._sum.totalPrice ?? 0,
            average: purchaseStats._avg.totalPrice ?? 0,
            count:   purchaseStats._count.id,
        },
    };
}

// ── Frontend public stats ─────────────────────────────────────────────────────
export async function getPublicStats() {
    const [
        avgDmRating, questsPerDm,
        questsThisWeek, questsThisMonth,
        charsByLevel,
        questStatsList,
        topBought, topSold,
        salesPerMonth, purchasesPerMonth,
    ] = await Promise.all([
        // Avg DM rating
        db.dMRating.aggregate({ _avg: { rating: true } }),
        // Avg quests per DM
        db.$queryRaw<{ avg: number }[]>`
            SELECT AVG(cnt)::float AS avg FROM (
                SELECT dm_profile_id, COUNT(*) AS cnt
                FROM quests.quests WHERE status = 'COMPLETED'
                GROUP BY dm_profile_id
            ) sub`,
        // Quests completed this week
        db.quest.count({ where: { status: 'COMPLETED', updatedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
        // Quests completed this month
        db.quest.count({ where: { status: 'COMPLETED', updatedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
        // Characters by progression threshold label
        db.$queryRaw<{ label: string; count: bigint }[]>`
            SELECT pt.label, COUNT(DISTINCT c.id)::bigint AS count
            FROM characters.characters c
            JOIN gamesystem.progression_thresholds pt
              ON c.total_xp >= pt.xp_required
            WHERE pt.id IN (
                SELECT DISTINCT ON (c2.id) pt2.id
                FROM characters.characters c2
                JOIN gamesystem.progression_thresholds pt2 ON c2.total_xp >= pt2.xp_required
                ORDER BY c2.id, pt2.xp_required DESC
            )
            GROUP BY pt.label ORDER BY MIN(pt.xp_required) ASC`,
        // Quest stats for avg party level chart
        db.questStat.findMany({ orderBy: { completedAt: 'asc' }, take: 50 }),
        // Top 10 most purchased items
        db.marketplaceTransaction.groupBy({
            by: ['itemId'], where: { type: 'BUY', status: 'APPROVED' },
            _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 10,
        }),
        // Top 10 most sold items
        db.marketplaceTransaction.groupBy({
            by: ['itemId'], where: { type: 'SELL', status: 'APPROVED' },
            _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 10,
        }),
        // Sales per month (last 6 months)
        db.$queryRaw<{ month: string; total: number; count: bigint }[]>`
            SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                   SUM(total_price)::float AS total, COUNT(*)::bigint AS count
            FROM marketplace.marketplace_transactions
            WHERE type = 'SELL' AND status = 'APPROVED' AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month ORDER BY month ASC`,
        // Purchases per month (last 6 months)
        db.$queryRaw<{ month: string; total: number; count: bigint }[]>`
            SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                   SUM(total_price)::float AS total, COUNT(*)::bigint AS count
            FROM marketplace.marketplace_transactions
            WHERE type = 'BUY' AND status = 'APPROVED' AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month ORDER BY month ASC`,
    ]);

    // Enrich item names
    const itemIds = [...new Set([...topBought.map(i => i.itemId), ...topSold.map(i => i.itemId)])];
    const items = itemIds.length
        ? await db.marketplaceItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true } })
        : [];
    const itemMap = Object.fromEntries(items.map(i => [i.id, i.name]));

    return {
        avgDmRating:     avgDmRating._avg.rating ?? 0,
        avgQuestsPerDm:  (questsPerDm[0]?.avg ?? 0),
        questsThisWeek,
        questsThisMonth,
        charsByLevel:    charsByLevel.map(r => ({ label: r.label, count: Number(r.count) })),
        questStats:      questStatsList,
        topBought:       topBought.map(i => ({ name: itemMap[i.itemId] ?? i.itemId, qty: i._sum.quantity ?? 0 })),
        topSold:         topSold.map(i => ({ name: itemMap[i.itemId] ?? i.itemId, qty: i._sum.quantity ?? 0 })),
        salesPerMonth:   salesPerMonth.map(r => ({ month: r.month, total: r.total, count: Number(r.count) })),
        purchasesPerMonth: purchasesPerMonth.map(r => ({ month: r.month, total: r.total, count: Number(r.count) })),
    };
}

// ── Per-user stats ────────────────────────────────────────────────────────────
export async function getUserStats(userId: string) {
    const chars = await db.character.findMany({ where: { userId }, select: { id: true, name: true, totalGold: true, totalXp: true } });
    const charIds = chars.map(c => c.id);

    const [questsAsPlayer, questsAsDM, salesAgg, purchasesAgg, salesPerMonth, purchasesPerMonth] = await Promise.all([
        db.questSignup.count({ where: { characterId: { in: charIds }, status: 'CONFIRMED',
            quest: { status: 'COMPLETED' } } }),
        db.$queryRaw<[{ count: bigint }]>(
            Prisma.sql`SELECT COUNT(*)::bigint AS count FROM quests.quests q
            JOIN dms.dm_profiles dp ON dp.id = q.dm_profile_id
            WHERE dp.user_id::text = ${userId} AND q.status = 'COMPLETED'`
        ).then(r => Number(r[0]?.count ?? 0)),
        db.marketplaceTransaction.aggregate({
            where: { characterId: { in: charIds }, type: 'SELL', status: 'APPROVED' },
            _sum: { totalPrice: true }, _avg: { totalPrice: true }, _count: { id: true },
        }),
        db.marketplaceTransaction.aggregate({
            where: { characterId: { in: charIds }, type: 'BUY', status: 'APPROVED' },
            _sum: { totalPrice: true }, _avg: { totalPrice: true }, _count: { id: true },
        }),
        // Sales per month per user
        charIds.length ? db.$queryRaw<{ month: string; total: number }[]>(
            Prisma.sql`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                SUM(total_price)::float AS total
                FROM marketplace.marketplace_transactions
                WHERE character_id::text = ANY(${charIds})
                AND type = 'SELL' AND status = 'APPROVED'
                AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY month ORDER BY month ASC`
        ) : Promise.resolve([] as { month: string; total: number }[]),
        // Purchases per month per user
        charIds.length ? db.$queryRaw<{ month: string; total: number }[]>(
            Prisma.sql`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                SUM(total_price)::float AS total
                FROM marketplace.marketplace_transactions
                WHERE character_id::text = ANY(${charIds})
                AND type = 'BUY' AND status = 'APPROVED'
                AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY month ORDER BY month ASC`
        ) : Promise.resolve([] as { month: string; total: number }[]),
    ]);

    // Per-character breakdown
    const charStats = await Promise.all(chars.map(async c => {
        const [sales, purchases] = await Promise.all([
            db.marketplaceTransaction.aggregate({
                where: { characterId: c.id, type: 'SELL', status: 'APPROVED' },
                _sum: { totalPrice: true }, _count: { id: true },
            }),
            db.marketplaceTransaction.aggregate({
                where: { characterId: c.id, type: 'BUY', status: 'APPROVED' },
                _sum: { totalPrice: true }, _count: { id: true },
            }),
        ]);
        return {
            id:            c.id,
            name:          c.name,
            totalGold:     c.totalGold,
            totalSales:    sales._sum.totalPrice    ?? 0,
            salesCount:    sales._count.id,
            totalPurchases: purchases._sum.totalPrice ?? 0,
            purchasesCount: purchases._count.id,
            delta:         (sales._sum.totalPrice ?? 0) - (purchases._sum.totalPrice ?? 0),
        };
    }));

    const totalWealth = chars.reduce((s, c) => s + c.totalGold, 0);

    return {
        questsAsPlayer, questsAsDM,
        totalSales:    salesAgg._sum.totalPrice    ?? 0,
        avgSale:       salesAgg._avg.totalPrice    ?? 0,
        salesCount:    salesAgg._count.id,
        totalPurchases: purchasesAgg._sum.totalPrice ?? 0,
        avgPurchase:   purchasesAgg._avg.totalPrice  ?? 0,
        purchasesCount: purchasesAgg._count.id,
        totalWealth,
        salesPerMonth,
        purchasesPerMonth,
        charStats,
    };
}