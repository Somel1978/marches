// shared/database/dbapi/write/dnd5e/update-character-feats.ts
import { db } from '../../../index.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { applyDnd5eAsiStatBump } from './update-ability-scores.ts';

const ASI_FEAT_NAME = 'Ability Score Improvement';

export async function addDnd5eCharacterFeat(
    characterId: string,
    featId: string,
    options?: {
        sourceClassId?: string;
        sourceLevel?:   number;
        // For ASI feat only:
        stat1?: string;
        amount1?: number;
        stat2?: string;
        amount2?: number;
        stat3?: string;
        amount3?: number;
    }
) {
    const feat = await db.dnd5eFeat.findUnique({ where: { id: featId } });
    if (!feat) throw new NotFoundError('Dnd5eFeat', featId);
    if (!feat.isAvailable) throw new ValidationError('This feat is not available.');

    // ASI feat is inherently repeatable (one per slot)
    const isAsiFeat = feat.name === ASI_FEAT_NAME;

    if (options?.sourceClassId && options?.sourceLevel) {
        // Slot-based save: delete existing row for this exact slot, then create fresh
        await db.dnd5eCharacterFeat.deleteMany({
            where: { characterId, sourceClassId: options.sourceClassId, sourceLevel: options.sourceLevel }
        });
        // Also clean up any orphan rows for the same featId (accumulated from failed saves)
        await db.dnd5eCharacterFeat.deleteMany({
            where: { characterId, featId, sourceClassId: null }
        });
        // Fall through to create fresh row
    } else if (!isAsiFeat && !feat.repeatable) {
        // No slot context, non-repeatable: check not already taken globally
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
            asiStat1:      options?.stat1          ?? null,
            asiAmount1:    options?.amount1        ?? null,
            asiStat2:      options?.stat2          ?? null,
            asiAmount2:    options?.amount2        ?? null,
        }
    });

    // If ASI feat — apply stat bump
    if (feat.name === ASI_FEAT_NAME && options?.stat1 && options?.amount1) {
        await applyDnd5eAsiStatBump(
            characterId,
            options.stat1 as any,
            options.amount1,
            options.stat2 as any,
            options.amount2,
            options.stat3 as any,
            options.amount3,
        );
    }

    return record;
}

export async function removeDnd5eCharacterFeat(id: string) {
    const row = await db.dnd5eCharacterFeat.findUnique({ where: { id }, include: { feat: true } });
    if (!row) throw new NotFoundError('Dnd5eCharacterFeat', id);

    // If ASI feat — reverse the stat bump using stored stat/amount values
    if ((row as any).feat?.name === ASI_FEAT_NAME) {
        const r = row as any;
        if (r.asiStat1 && r.asiAmount1) {
            await db.dnd5eAbilityScore.updateMany({
                where: { characterId: r.characterId, stat: r.asiStat1 },
                data:  { baseScore: { decrement: r.asiAmount1 } },
            });
        }
        if (r.asiStat2 && r.asiAmount2) {
            await db.dnd5eAbilityScore.updateMany({
                where: { characterId: r.characterId, stat: r.asiStat2 },
                data:  { baseScore: { decrement: r.asiAmount2 } },
            });
        }
    }

    return db.dnd5eCharacterFeat.delete({ where: { id } });
}