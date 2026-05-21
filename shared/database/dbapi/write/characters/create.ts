// shared/database/dbapi/write/characters/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ConflictError, ValidationError } from '@core/errors';
import { getSlotInfo } from '../../read/characters/get-slot-info.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';

export async function createCharacter(
    input: {
        userId:       string;
        gameSystemId: string;
        name:         string;
        speciesId?:   string;
        avatarUrl?:   string;
        portraitUrl?: string;
    },
    actorId?: string,
) {
    // Check name uniqueness
    const existing = await db.character.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`Character name '${input.name}' is already taken.`);

    // Check slot availability
    const slotInfo = await getSlotInfo(input.userId);
    if (slotInfo.available <= 0) {
        throw new ValidationError(`No character slots available. Used ${slotInfo.used} of ${slotInfo.total}.`);
    }

    const settings     = await getSettingsMap();
    const startingGold = Number(settings['character.startingGold'] ?? 100);

    const character = await db.$transaction(async (tx) => {
        const character = await tx.character.create({
            data: {
                userId:       input.userId,
                gameSystemId: input.gameSystemId,
                name:         input.name,
                speciesId:    input.speciesId,
                avatarUrl:    input.avatarUrl,
                portraitUrl:  input.portraitUrl,
                totalGold:    startingGold,
                status:       'PENDING',
            },
        });

        // Record starting gold transaction
        if (startingGold > 0) {
            await tx.characterTransaction.create({
                data: {
                    characterId: character.id,
                    type:        'GOLD',
                    delta:       startingGold,
                    sourceType:  'SYSTEM',
                    note:        'Starting gold',
                    createdBy:   actorId ?? input.userId,
                },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      'CREATE',
            resourceKey: 'Character',
            resourceId:  character.id,
            after:       character,
        });

        return character;
    });

    await createNotificationsForAdmins(
        'CHARACTER_PENDING', 'New character awaiting approval',
        `A new character "${input.name}" has been submitted for approval.`,
        `/characters/${character.id}`,
    );

    return character;
}