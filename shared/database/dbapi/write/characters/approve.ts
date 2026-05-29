// shared/database/dbapi/write/characters/approve.ts
import { db, Prisma } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotification } from '../notifications/notifications.ts';
import { NotFoundError, ValidationError } from '@core/errors';

export async function approveCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id }, include: { classes: true } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING')
        throw new ValidationError('Character is not in PENDING status.');

    const pending = (character as any).pendingChanges as any;
    const isEdit  = character.statusReason === 'EDIT_PENDING';
    const isNew   = character.statusReason === 'NEW_CHARACTER';
    const isLevelUp   = character.statusReason === 'LEVEL_UP_PENDING';
    const isLevelDown = character.statusReason === 'LEVEL_DOWN_PENDING';

    await db.$transaction(async (tx) => {
        // Apply pending structural changes if present
        if (pending && (isEdit || isLevelUp || isLevelDown)) {
            if (pending.classes) {
                // Deduplicate: if same classId appears multiple times, keep the last entry
                const classMap = new Map<string, any>();
                for (const c of pending.classes) {
                    classMap.set(c.classId, c);
                }
                const deduped = Array.from(classMap.values());

                await tx.characterClass.deleteMany({ where: { characterId: id } });
                await tx.characterClass.createMany({
                    data: deduped.map((c: any) => ({
                        characterId:    id,
                        classId:        c.classId,
                        subclassId:     c.subclassId ?? null,
                        allocatedLevel: c.allocatedLevel,
                    })),
                });
            }

            await tx.character.update({
                where: { id },
                data: {
                    ...(pending.speciesId    !== undefined && { speciesId:    pending.speciesId    }),
                    ...(pending.backgroundId !== undefined && { backgroundId: pending.backgroundId }),
                    ...(pending.worldId      !== undefined && { worldId:      pending.worldId      }),
                    ...(pending.isGlobal     !== undefined && { isGlobal:     pending.isGlobal     }),
                    status:          'ACTIVE',
                    statusReason:    null,
                    statusChangedAt: new Date(),
                    pendingChanges:  Prisma.JsonNull,
                    restUntil:       null,
                },
            });
        } else {
            await tx.character.update({
                where: { id },
                data: {
                    status:          'ACTIVE',
                    statusReason:    null,
                    statusChangedAt: new Date(),
                    pendingChanges:  Prisma.JsonNull,
                    restUntil:       null,
                },
            });
        }

        await tx.characterTransaction.create({
            data: {
                characterId: id,
                type:        'STATUS',
                fromValue:   'PENDING',
                toValue:     'ACTIVE',
                sourceType:  'ADMIN',
                note:        isLevelUp ? 'Level-up approved' : isEdit ? 'Character edit approved' : 'Character approved',
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
    });

    await createNotification(
        character.userId, 'CHARACTER_APPROVED', 'Character approved',
        isLevelDown ? 'Your level adjustment has been approved!'
        : isLevelUp ? 'Your level-up has been approved!'
        : isEdit    ? 'Your character changes have been approved!'
        : 'Your character has been approved!',
        `/characters/${id}`,
    );

    return db.character.findUnique({ where: { id } });
}

export async function rejectCharacter(id: string, note: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING')
        throw new ValidationError('Character is not in PENDING status.');

    const isLevelUp   = character.statusReason === 'LEVEL_UP_PENDING';
    const isLevelDown = character.statusReason === 'LEVEL_DOWN_PENDING';
    const newStatus = (isLevelUp || isLevelDown) ? 'ACTIVE' : 'REJECTED';

    await db.$transaction(async (tx) => {
        await tx.character.update({
            where: { id },
            data: {
                status:          newStatus as any,
                statusReason:    'ADMIN',
                statusChangedAt: new Date(),
                pendingChanges:  Prisma.JsonNull,
            },
        });

        await tx.characterTransaction.create({
            data: {
                characterId: id,
                type:        'STATUS',
                fromValue:   'PENDING',
                toValue:     newStatus,
                sourceType:  'ADMIN',
                note:        isLevelUp ? `Level-up rejected: ${note}` : `Character rejected: ${note}`,
                createdBy:   actorId,
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      { status: 'PENDING' },
            after:       { status: newStatus, note },
        });
    });

    await createNotification(
        character.userId, 'CHARACTER_REJECTED',
        isLevelUp ? 'Level-up rejected' : 'Character rejected',
        note,
        `/characters/${id}`,
    );

    return db.character.findUnique({ where: { id } });
}