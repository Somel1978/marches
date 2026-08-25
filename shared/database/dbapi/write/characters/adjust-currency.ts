// shared/database/dbapi/write/characters/adjust-currency.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { applyProgressionChange } from './progression.ts';

export type CurrencyType = 'XP' | 'GOLD' | 'TOKEN' | 'MILESTONE';

export async function adjustCurrency(
    characterId: string,
    type: CurrencyType,
    delta: number,
    note: string,
    actorId: string,
) {
    const character = await db.character.findUnique({
        where:   { id: characterId },
    });
    if (!character) throw new NotFoundError('Character', characterId);
    if (!note?.trim()) throw new ValidationError('Note is required for currency adjustments.');

    const fieldMap: Record<CurrencyType, 'totalXp' | 'totalGold' | 'totalTokens' | 'totalMilestones'> = {
        XP:        'totalXp',
        GOLD:      'totalGold',
        TOKEN:     'totalTokens',
        MILESTONE: 'totalMilestones',
    };

    const field    = fieldMap[type];
    const current  = character[field] as number;
    const newValue = current + delta;

    if (newValue < 0) throw new ValidationError(`${type} cannot go below 0. Current: ${current}, delta: ${delta}.`);

    return db.$transaction(async (tx) => {
        // XP and milestone credits both feed levelling, so they go through the
        // single progression path which writes the total, the transaction and
        // any resulting level-up/down state.
        if (type === 'XP' || type === 'MILESTONE') {
            await applyProgressionChange(tx, {
                characterId,
                actorId,
                ...(type === 'XP' ? { xpDelta: delta } : { milestoneDelta: delta }),
                source: { type: 'ADMIN', note },
            });
        } else {
            await tx.character.update({
                where: { id: characterId },
                data:  { [field]: newValue },
            });
            await tx.characterTransaction.create({
                data: {
                    characterId,
                    type:       type === 'TOKEN' ? 'TOKEN' : type as any,
                    delta,
                    fromValue:  String(current),
                    toValue:    String(newValue),
                    sourceType: 'ADMIN',
                    note,
                    createdBy:  actorId,
                },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  characterId,
            before:      { [field]: current },
            after:       { [field]: newValue, note },
        });

        return tx.character.findUnique({ where: { id: characterId } });
    });
}
