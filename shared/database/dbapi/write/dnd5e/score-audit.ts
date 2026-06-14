// shared/database/dbapi/write/dnd5e/score-audit.ts
import { db } from '../../../index.ts';

export type ScoreAuditInput = {
    characterId: string;
    stat:        string;
    delta:       number;
    source:      'INITIAL' | 'ASI' | 'FEAT' | 'MANUAL';
    note?:       string;
    sourceId?:   string;
    actorId?:    string;
};

export async function addScoreAuditEntry(entry: ScoreAuditInput) {
    return db.dnd5eScoreAuditEntry.create({
        data: {
            characterId: entry.characterId,
            stat:        entry.stat as any,
            delta:       entry.delta,
            source:      entry.source as any,
            note:        entry.note    ?? null,
            sourceId:    entry.sourceId ?? null,
            actorId:     entry.actorId  ?? null,
        },
    });
}

export async function addScoreAuditEntries(entries: ScoreAuditInput[]) {
    return db.dnd5eScoreAuditEntry.createMany({ data: entries.map(e => ({
        characterId: e.characterId,
        stat:        e.stat as any,
        delta:       e.delta,
        source:      e.source as any,
        note:        e.note    ?? null,
        sourceId:    e.sourceId ?? null,
        actorId:     e.actorId  ?? null,
    })) });
}

// DM manual score adjustment — applies delta to baseScore and writes audit entry
export async function applyManualScoreAdjustment(
    characterId: string,
    stat:        string,
    delta:       number,
    note:        string,
    actorId?:    string,
) {
    await db.dnd5eAbilityScore.updateMany({
        where: { characterId, stat: stat as any },
        data:  { baseScore: { increment: delta } },
    });
    return addScoreAuditEntry({ characterId, stat, delta, source: 'MANUAL', note, actorId });
}
