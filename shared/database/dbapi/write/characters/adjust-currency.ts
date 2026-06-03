// shared/database/dbapi/write/characters/adjust-currency.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import { checkLevelChange } from './level-check.ts';

export type CurrencyType = 'XP' | 'GOLD' | 'TOKEN';

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

    const fieldMap: Record<CurrencyType, 'totalXp' | 'totalGold' | 'totalTokens'> = {
        XP:    'totalXp',
        GOLD:  'totalGold',
        TOKEN: 'totalTokens',
    };

    const field    = fieldMap[type];
    const current  = character[field] as number;
    const newValue = current + delta;

    if (newValue < 0) throw new ValidationError(`${type} cannot go below 0. Current: ${current}, delta: ${delta}.`);

    return db.$transaction(async (tx) => {
        const updated = await tx.character.update({
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

        // ── Level-up / level-down detection ──
        if (type === 'XP') {
            await checkLevelChange(tx, characterId, character.userId, character.gameSystemId,
                current, newValue, character.level, actorId);
        }

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  characterId,
            before:      { [field]: current },
            after:       { [field]: newValue, note },
        });

        return updated;
    });
}