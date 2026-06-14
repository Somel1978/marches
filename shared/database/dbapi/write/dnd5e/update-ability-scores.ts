// shared/database/dbapi/write/dnd5e/update-ability-scores.ts
import { db } from '../../../index.ts';
import { addScoreAuditEntries } from './score-audit.ts';

const STATS = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as const;
type Stat = typeof STATS[number];

export async function saveDnd5eAbilityScores(
    characterId: string,
    scores: Record<Stat, number>,
    actorId?: string,
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

    // Check if this character already has audit entries — if not, these are initial scores
    const existingAudit = await db.dnd5eScoreAuditEntry.findFirst({ where: { characterId } });
    if (!existingAudit) {
        // First time scores are set — write INITIAL audit entries
        await addScoreAuditEntries(
            STATS.filter(st => scores[st] != null).map(st => ({
                characterId,
                stat:   st,
                delta:  scores[st],
                source: 'INITIAL' as const,
                note:   'Initial scores set',
                actorId,
            }))
        );
    } else {
        // Scores edited — write audit entries showing the delta from current baseScore
        const current = await db.dnd5eAbilityScore.findMany({ where: { characterId } });
        const currentMap = Object.fromEntries(current.map(r => [r.stat, r.baseScore]));
        const entries = STATS
            .filter(st => scores[st] != null && scores[st] !== currentMap[st])
            .map(st => ({
                characterId,
                stat:   st,
                delta:  scores[st] - (currentMap[st] ?? 0),
                source: 'MANUAL' as const,
                note:   'Scores edited',
                actorId,
            }));
        if (entries.length) await addScoreAuditEntries(entries);
    }
}

export async function applyDnd5eAsiStatBump(
    characterId: string,
    stat1: Stat,
    amount1: number,
    stat2?: Stat,
    amount2?: number,
    stat3?: Stat,
    amount3?: number,
    opts?: { note?: string; sourceId?: string; actorId?: string; source?: 'ASI' | 'FEAT' }
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

    // Write audit entries
    const source = opts?.source ?? 'ASI';
    const auditEntries = [
        { characterId, stat: stat1, delta: amount1, source, note: opts?.note, sourceId: opts?.sourceId, actorId: opts?.actorId },
        ...(stat2 && amount2 ? [{ characterId, stat: stat2, delta: amount2, source, note: opts?.note, sourceId: opts?.sourceId, actorId: opts?.actorId }] : []),
        ...(stat3 && amount3 ? [{ characterId, stat: stat3, delta: amount3, source, note: opts?.note, sourceId: opts?.sourceId, actorId: opts?.actorId }] : []),
    ] as Parameters<typeof addScoreAuditEntries>[0];
    await addScoreAuditEntries(auditEntries);
}