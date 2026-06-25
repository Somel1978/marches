// shared/database/dbapi/write/dnd5e/update-character-feats.ts
import { db } from '../../../index.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { applyDnd5eAsiStatBump } from './update-ability-scores.ts';
import { addScoreAuditEntries } from './score-audit.ts';

// Helper: reverse a stat bump and write audit entries for the reversal
async function reverseStatBump(
    characterId: string,
    asiStat1: string | null,
    asiAmount1: number | null,
    asiStat2: string | null,
    asiAmount2: number | null,
    note: string,
    sourceId?: string,
    actorId?: string,
    source: 'ASI' | 'FEAT' = 'ASI',
) {
    const entries: any[] = [];
    if (asiStat1 && asiAmount1) {
        await db.dnd5eAbilityScore.updateMany({
            where: { characterId, stat: asiStat1 as any },
            data:  { baseScore: { decrement: asiAmount1 } },
        });
        entries.push({ characterId, stat: asiStat1, delta: -asiAmount1, source, note, sourceId, actorId });
    }
    if (asiStat2 && asiAmount2) {
        await db.dnd5eAbilityScore.updateMany({
            where: { characterId, stat: asiStat2 as any },
            data:  { baseScore: { decrement: asiAmount2 } },
        });
        entries.push({ characterId, stat: asiStat2, delta: -asiAmount2, source, note, sourceId, actorId });
    }
    if (entries.length) await addScoreAuditEntries(entries);
}

export async function addDnd5eCharacterFeat(
    characterId: string,
    featId: string,
    options?: {
        sourceClassId?: string;
        sourceLevel?:   number;
        stat1?:         string;
        amount1?:       number;
        stat2?:         string;
        amount2?:       number;
        stat3?:         string;
        amount3?:       number;
        chosenSkills?:  string[];   // player's chosen skills from skillChoicePool
        chosenSaves?:   string[];   // player's chosen saving throws from savingThrowChoicePool
        actorId?:       string;
    }
) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id: featId } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', featId);
    if (!feat.isAvailable) throw new ValidationError('This feat is not available.');

    if (options?.sourceClassId && options?.sourceLevel) {
        // Slot-based save: reverse any existing stat bump for this slot before replacing
        const existing = await db.dnd5eCharacterFeat.findFirst({
            where:   { characterId, sourceClassId: options.sourceClassId, sourceLevel: options.sourceLevel },
            include: { feat: true },
        });
        if (existing) {
            const e    = existing as any;
            const isAsiSource = e.feat?.name?.trim() === 'Ability Score Improvement' ? 'ASI' : 'FEAT';
            await reverseStatBump(
                characterId,
                e.asiStat1, e.asiAmount1,
                e.asiStat2, e.asiAmount2,
                `${e.feat?.name ?? 'Previous feat'} removed`,
                e.id,
                options.actorId,
                isAsiSource,
            );
        }
        await db.dnd5eCharacterFeat.deleteMany({
            where: { characterId, sourceClassId: options.sourceClassId, sourceLevel: options.sourceLevel }
        });
        await db.dnd5eCharacterFeat.deleteMany({
            where: { characterId, featId, sourceClassId: null }
        });
    } else if (!feat.repeatable) {
        const existing = await db.dnd5eCharacterFeat.findFirst({ where: { characterId, featId } });
        if (existing) throw new ValidationError(`Feat "${feat.name}" has already been taken and is not repeatable.`);
    }

    // Create the feat record
    const record = await db.dnd5eCharacterFeat.create({
        data: {
            characterId,
            featId,
            sourceClassId: options?.sourceClassId ?? null,
            sourceLevel:   options?.sourceLevel   ?? null,
            asiStat1:      options?.stat1         ?? null,
            asiAmount1:    options?.amount1       ?? null,
            asiStat2:      options?.stat2         ?? null,
            asiAmount2:    options?.amount2       ?? null,
        }
    });

    // Apply stat bump with audit entry
    if (options?.stat1 && options?.amount1) {
        const isAsiSource = feat.name?.trim() === 'Ability Score Improvement' ? 'ASI' : 'FEAT';
        await applyDnd5eAsiStatBump(
            characterId,
            options.stat1 as any,
            options.amount1,
            options.stat2 as any,
            options.amount2,
            options.stat3 as any,
            options.amount3,
            {
                note:     `${feat.name} added`,
                sourceId: record.id,
                actorId:  options.actorId,
                source:   isAsiSource,
            }
        );
    }

    // Apply skill grants from feat (fixed + player choices)
    const skillGrants: { skill: string; value: number }[] = [];
    const f = feat as any;
    if (f.grantsSkills)    for (const s of f.grantsSkills.split(',').filter(Boolean))    skillGrants.push({ skill: s.trim(), value: 1.0 });
    if (f.grantsExpertise) for (const s of f.grantsExpertise.split(',').filter(Boolean)) skillGrants.push({ skill: s.trim(), value: 2.0 });
    if (f.grantsHalfSkills) for (const s of f.grantsHalfSkills.split(',').filter(Boolean)) skillGrants.push({ skill: s.trim(), value: 0.5 });
    if (options?.chosenSkills?.length) for (const s of options.chosenSkills) skillGrants.push({ skill: s, value: 1.0 });
    if (skillGrants.length) {
        await db.dnd5eCharacterSkillGrant.createMany({
            data: skillGrants.map(g => ({ characterId, skill: g.skill as any, value: g.value, sourceType: 'Feat', sourceId: record.id })),
        });
    }
    if (f.grantsSavingThrows) {
        const stats = f.grantsSavingThrows.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (stats.length) await db.dnd5eCharacterSavingThrowGrant.createMany({
            data: stats.map((stat: string) => ({ characterId, stat, sourceType: 'Feat', sourceId: record.id })),
        });
    }
    if (options?.chosenSaves?.length) {
        await db.dnd5eCharacterSavingThrowGrant.createMany({
            data: options.chosenSaves.map((stat: string) => ({ characterId, stat, sourceType: 'Feat', sourceId: record.id })),
        });
    }

    return record;
}

export async function removeDnd5eCharacterFeat(id: string, actorId?: string) {
    const row = await db.dnd5eCharacterFeat.findUnique({ where: { id }, include: { feat: true } });
    if (!row) throw new NotFoundError('Dnd5eCharacterFeat', id);

    const r = row as any;
    const isAsiSource = r.feat?.name?.trim() === 'Ability Score Improvement' ? 'ASI' : 'FEAT';
    await reverseStatBump(
        r.characterId,
        r.asiStat1, r.asiAmount1,
        r.asiStat2, r.asiAmount2,
        `${r.feat?.name ?? 'Feat'} removed`,
        id,
        actorId,
        isAsiSource,
    );

    // Remove skill and saving throw grants from this feat
    await db.dnd5eCharacterSkillGrant.deleteMany({ where: { characterId: r.characterId, sourceId: id } });
    await db.dnd5eCharacterSavingThrowGrant.deleteMany({ where: { characterId: r.characterId, sourceId: id } });

    return db.dnd5eCharacterFeat.delete({ where: { id } });
}