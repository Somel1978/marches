// shared/database/dbapi/write/characters/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ConflictError, ValidationError } from '@core/errors';
import { getSlotInfo } from '../../read/characters/get-slot-info.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import { createNotificationsForAdmins } from '../notifications/notifications.ts';
import { queueDiscordNotification } from '../discord/dispatcher';

export type ClassAllocationInput = {
    classId:        string;
    subclassId?:    string | null;
    allocatedLevel: number;
};

export async function createCharacter(
    input: {
        userId:        string;
        gameSystemId:  string;
        name:          string;
        speciesId?:    string;
        backgroundId?: string;
        avatarUrl?:    string;
        portraitUrl?:  string;
        description?:  string;
        worldId?:      string;
        isGlobal?:     boolean;
        classes?:      ClassAllocationInput[];
    },
    actorId?: string,
) {
    const existing = await db.character.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`Character name '${input.name}' is already taken.`);

    const slotInfo = await getSlotInfo(input.userId);
    if (slotInfo.available <= 0)
        throw new ValidationError(`No character slots available. Used ${slotInfo.used} of ${slotInfo.total}.`);

    if (!input.speciesId)    throw new ValidationError('Species is required.');
    if (!input.backgroundId) throw new ValidationError('Background is required.');
    if (!input.classes?.length) throw new ValidationError('At least one class is required.');

    const settings     = await getSettingsMap();
    const startingGold = Number(settings['character.startingGold'] ?? 100);

    const character = await db.$transaction(async (tx) => {
        const char = await tx.character.create({
            data: {
                userId:        input.userId,
                gameSystemId:  input.gameSystemId,
                name:          input.name,
                speciesId:     input.speciesId,
                backgroundId:  input.backgroundId,
                avatarUrl:     input.avatarUrl    ?? null,
                portraitUrl:   input.portraitUrl  ?? null,
                description:   input.description  ?? null,
                worldId:       input.worldId      ?? null,
                isGlobal:      input.isGlobal      ?? false,
                totalGold:     startingGold,
                status:        'PENDING',
                statusReason:  'NEW_CHARACTER',
            },
        });

        if (input.classes?.length) {
            await tx.characterClass.createMany({
                data: input.classes.map(c => ({
                    characterId:    char.id,
                    classId:        c.classId,
                    subclassId:     c.subclassId ?? null,
                    allocatedLevel: c.allocatedLevel,
                })),
            });
        }

        if (startingGold > 0) {
            await tx.characterTransaction.create({
                data: {
                    characterId: char.id,
                    type:        'GOLD',
                    delta:       startingGold,
                    sourceType:  'SYSTEM',
                    note:        'Starting gold',
                    createdBy:   actorId ?? input.userId,
                },
            });
        }

        await logAudit(tx, { actorId, action: 'CREATE', resourceKey: 'Character', resourceId: char.id, after: char });
        return char;
    });

    await createNotificationsForAdmins(
        'CHARACTER_PENDING', 'New character awaiting approval',
        `A new character "${input.name}" has been submitted for approval.`,
        `/characters/${character.id}`,
    );

    try {
        await queueDiscordNotification('CHAR_PENDING_APPROVAL', {
            char: { name: character.name, statusReason: 'NEW_CHARACTER', worldId: (character as any).worldId ?? null },
        });
    } catch { /* discord not running */ }

    return character;
}