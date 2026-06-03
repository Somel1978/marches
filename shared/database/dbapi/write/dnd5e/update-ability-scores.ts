// shared/database/dbapi/write/dnd5e/update-ability-scores.ts
import { db } from '../../../index.ts';
import { NotFoundError } from '@core/errors';

const STATS = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as const;
type Stat = typeof STATS[number];

export async function saveDnd5eAbilityScores(
    characterId: string,
    scores: Record<Stat, number>,
) {
    // Upsert all 6 stats
    await Promise.all(
        STATS.map(stat =>
            db.dnd5eAbilityScore.upsert({
                where:  { characterId_stat: { characterId, stat } },
                create: { characterId, stat, baseScore: scores[stat] ?? 8 },
                update: { baseScore: scores[stat] ?? 8 },
            })
        )
    );
}

export async function applyDnd5eAsiStatBump(
    characterId: string,
    stat1: Stat,
    amount1: number,
    stat2?: Stat,
    amount2?: number,
    stat3?: Stat,
    amount3?: number,
) {
    // Ensure score rows exist first
    await Promise.all(
        STATS.map(stat =>
            db.dnd5eAbilityScore.upsert({
                where:  { characterId_stat: { characterId, stat } },
                create: { characterId, stat, baseScore: 8 },
                update: {},
            })
        )
    );

    // Apply bumps
    await db.dnd5eAbilityScore.update({
        where: { characterId_stat: { characterId, stat: stat1 } },
        data:  { baseScore: { increment: amount1 } },
    });

    if (stat2 && amount2) {
        await db.dnd5eAbilityScore.update({
            where: { characterId_stat: { characterId, stat: stat2 } },
            data:  { baseScore: { increment: amount2 } },
        });
    }
    if (stat3 && amount3) {
        await db.dnd5eAbilityScore.update({
            where: { characterId_stat: { characterId, stat: stat3 } },
            data:  { baseScore: { increment: amount3 } },
        });
    }
}