// shared/database/dbapi/write/characters/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ConflictError, ValidationError } from '@core/errors';
import { getSlotInfo } from '../../read/characters/get-slot-info.ts';
import { getSettingsMap } from '../../read/platform/get-settings.ts';
import { createNotificationsForAdmins, createNotificationsForWorldDMs } from '../notifications/notifications.ts';
import { queueDiscordNotification } from '../discord/dispatcher.ts';

// Universal character creation — no system-specific fields
// For dnd5e characters use dnd5e.createCharacter() instead
export async function createCharacter(
    input: {
        userId:        string;
        gameSystemId:  string;
        name:          string;
        avatarUrl?:    string;
        portraitUrl?:  string;
        description?:  string;
        worldId?:      string;
        isGlobal?:     boolean;
        level?:        number;
        totalXp?:      number;
    },
    actorId?: string,
) {
    const existing = await db.character.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`Character name '${input.name}' is already taken.`);

    const slotInfo = await getSlotInfo(input.userId);
    if (slotInfo.available <= 0)
        throw new ValidationError(`No character slots available. Used ${slotInfo.used} of ${slotInfo.total}.`);

    const settings     = await getSettingsMap();
    const startingGold = Number(settings['character.startingGold'] ?? 100);

    const character = await db.$transaction(async (tx) => {
        const char = await tx.character.create({
            data: {
                userId:        input.userId,
                gameSystemId:  input.gameSystemId,
                name:          input.name,
                level:         input.level  ?? 0,
                totalXp:       input.totalXp ?? 0,
                avatarUrl:     input.avatarUrl   ?? null,
                portraitUrl:   input.portraitUrl ?? null,
                description:   input.description ?? null,
                worldId:       input.worldId     ?? null,
                isGlobal:      input.isGlobal    ?? false,
                totalGold:     startingGold,
                status:        'PENDING',
                statusReason:  'NEW_CHARACTER',
            },
        });

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

    if (input.worldId) {
        await createNotificationsForWorldDMs(
            input.worldId,
            'CHARACTER_PENDING', 'New character awaiting approval',
            `A new character "${input.name}" has been submitted for approval.`,
            `/dm/worlds/${input.worldId}/characters`,
        );
    }

    try {
        // In-app notifications for admins and world DMs
        await createNotificationsForAdmins(
            'CHAR_PENDING_APPROVAL',
            `Character awaiting approval: ${input.name}`,
            `${input.name} has been submitted for review.`,
            `/characters/${character.id}`,
        ).catch(e => console.error('[notifications] admin notify failed:', e));
        if (input.worldId) {
            await createNotificationsForWorldDMs(
                input.worldId,
                'CHAR_PENDING_APPROVAL',
                `Character awaiting approval: ${input.name}`,
                `${input.name} has been submitted for review.`,
                `/dm/worlds/${input.worldId}/characters/${character.id}`,
            ).catch(e => console.error('[notifications] world DM notify failed:', e));
        }
        await queueDiscordNotification('CHAR_PENDING_APPROVAL', {
            char: { name: character.name, statusReason: 'NEW_CHARACTER', worldId: input.worldId ?? null },
        });
    } catch { /* discord not running */ }

    return character;
}