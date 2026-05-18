// shared/database/dbapi/write/characters/approve.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function approveCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING') {
        throw new ValidationError('Character is not in PENDING status.');
    }

    return db.$transaction(async (tx) => {
        const updated = await tx.character.update({
            where: { id },
            data: {
                status:          'ACTIVE',
                statusReason:    null,
                statusChangedAt: new Date(),
                restUntil:       null,
            },
        });

        await tx.characterTransaction.create({
            data: {
                characterId: id,
                type:        'STATUS',
                fromValue:   'PENDING',
                toValue:     'ACTIVE',
                sourceType:  'ADMIN',
                note:        character.statusReason === 'LEVEL_UP_PENDING'
                    ? 'Level-up approved'
                    : 'Character approved',
                createdBy:   actorId,
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      { status: 'PENDING', statusReason: character.statusReason },
            after:       { status: 'ACTIVE' },
        });

        return updated;
    });
}

export async function rejectCharacter(id: string, note: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING') {
        throw new ValidationError('Character is not in PENDING status.');
    }

    const isLevelUp = character.statusReason === 'LEVEL_UP_PENDING';

    return db.$transaction(async (tx) => {
        // Characters are NEVER deleted by workflow — always soft rejected
        // Level-up rejection: revert to ACTIVE
        // New character rejection: set REJECTED status (admin can manually delete if needed)
        const newStatus = isLevelUp ? 'ACTIVE' : 'REJECTED';

        const updated = await tx.character.update({
            where: { id },
            data: {
                status:          newStatus as any,
                statusReason:    'ADMIN',
                statusChangedAt: new Date(),
            },
        });

        await tx.characterTransaction.create({
            data: {
                characterId: id,
                type:        'STATUS',
                fromValue:   'PENDING',
                toValue:     newStatus,
                sourceType:  'ADMIN',
                note:        isLevelUp
                    ? `Level-up rejected: ${note}`
                    : `Character rejected: ${note}`,
                createdBy:   actorId,
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      { status: 'PENDING', statusReason: character.statusReason },
            after:       { status: newStatus, note },
        });

        return updated;
    });
}