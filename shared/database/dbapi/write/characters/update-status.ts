// shared/database/dbapi/write/characters/update-status.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotification } from '../notifications/notifications.ts';
import { NotFoundError } from '@core/errors';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import type { CharacterStatus, CharacterStatusReason } from '@prisma/client';

export async function updateCharacterStatus(
    id: string,
    status: CharacterStatus,
    reason?: CharacterStatusReason | null,
    note?: string,
    actorId?: string,
) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    const restUntil = status === 'RESTING' && reason === 'QUEST_REST'
        ? await getRestUntil()
        : null;

    // NOTE: CHARACTER_APPROVED and CHARACTER_REJECTED notifications are sent by
    // approveCharacter() and rejectCharacter() in approve.ts — do NOT duplicate them here.
    // updateCharacterStatus is for admin/DM manual status overrides only.

    return db.$transaction(async (tx) => {
        const updated = await tx.character.update({
            where: { id },
            data: {
                status,
                statusReason:    reason ?? null,
                statusChangedAt: new Date(),
                ...(restUntil !== undefined && { restUntil }),
            },
        });

        await tx.characterTransaction.create({
            data: {
                characterId: id,
                type:        'STATUS',
                fromValue:   character.status,
                toValue:     status,
                sourceType:  actorId ? 'ADMIN' : 'SYSTEM',
                note:        note ?? null,
                createdBy:   actorId ?? 'system',
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'Character',
            resourceId:  id,
            before:      { status: character.status, statusReason: character.statusReason },
            after:       { status, statusReason: reason },
        });

        return updated;
    });
}

async function getRestUntil(): Promise<Date> {
    const settings  = await getSettingsMap();
    const restDays  = Number(settings['character.restDays'] ?? 7);
    const restUntil = new Date();
    restUntil.setDate(restUntil.getDate() + restDays);
    return restUntil;
}