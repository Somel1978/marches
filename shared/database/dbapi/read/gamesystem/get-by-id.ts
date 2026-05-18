// shared/database/dbapi/read/gamesystem/get-by-id.ts
import { db, Prisma } from '../../../index.ts';

const gameSystemInclude = {
    classes: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
            subclasses: {
                orderBy: { sortOrder: 'asc' as const },
            },
        },
    },
    species: {
        orderBy: { sortOrder: 'asc' as const },
    },
    progressionThresholds: {
        orderBy: { xpRequired: 'asc' as const },
    },
} satisfies Prisma.GameSystemInclude;

export type GameSystemWithDetails = Prisma.GameSystemGetPayload<{
    include: typeof gameSystemInclude;
}>;

export async function getGameSystemById(id: string): Promise<GameSystemWithDetails | null> {
    return db.gameSystem.findUnique({
        where:   { id },
        include: gameSystemInclude,
    });
}