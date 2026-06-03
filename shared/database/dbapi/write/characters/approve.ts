// shared/database/dbapi/write/characters/approve.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { createNotification } from '../notifications/notifications.ts';
import { queueDiscordNotification } from '../discord/dispatcher';
import { NotFoundError, ValidationError } from '@core/errors';

// Universal character approval — handles status transition, audit, notifications only.
// System-specific pending changes (e.g. dnd5e classes/species/background) must be
// applied BEFORE calling this function via the system's own applyPendingChanges().
export async function approveCharacter(id: string, actorId: string, newLevel?: number) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING')
        throw new ValidationError('Character is not in PENDING status.');

    const isEdit      = character.statusReason === 'EDIT_PENDING';
    const isLevelUp   = character.statusReason === 'LEVEL_UP_PENDING';
    const isLevelDown = character.statusReason === 'LEVEL_DOWN_PENDING';

    await db.$transaction(async (tx) => {
        await tx.character.update({
            where: { id },
            data: {
                ...(newLevel !== undefined && { level: newLevel }),
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

    const approved = await db.character.findUnique({ where: { id } });
    try {
        await queueDiscordNotification('CHAR_APPROVED', {
            char: { name: approved?.name ?? '', worldId: approved?.worldId ?? null },
        });
    } catch { /* discord not running */ }

    return approved;
}

// Universal rejection — clears status, audit, notifications.
// System-specific cleanup (e.g. clearing dnd5e pendingChanges) must be
// handled BEFORE calling this via the system's own clearPendingChanges().
export async function rejectCharacter(id: string, note: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);
    if (character.status !== 'PENDING')
        throw new ValidationError('Character is not in PENDING status.');

    const isLevelUp   = character.statusReason === 'LEVEL_UP_PENDING';
    const isLevelDown = character.statusReason === 'LEVEL_DOWN_PENDING';
    const newStatus   = (isLevelUp || isLevelDown) ? 'ACTIVE' : 'REJECTED';

    await db.$transaction(async (tx) => {
        await tx.character.update({
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

    try {
        await queueDiscordNotification('CHAR_REJECTED', {
            char: { name: character.name, worldId: character.worldId ?? null },
            note,
        });
    } catch { /* discord not running */ }

    return db.character.findUnique({ where: { id } });
}


// ── System-agnostic dispatchers ───────────────────────────────────────────────
// Always call these from app code — never call system-specific approve/reject directly.

export async function dispatchApproveCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    const gs   = await db.gameSystem.findUnique({ where: { id: character.gameSystemId } });
    const slug = gs?.slug ?? '';

    if (slug === 'dnd5e') {
        const { approveDnd5eCharacter } = await import('../dnd5e/approve-character.ts');
        return approveDnd5eCharacter(id, actorId);
    }

    // Universal fallback — no system-specific pending changes to apply
    return approveCharacter(id, actorId);
}

export async function dispatchRejectCharacter(id: string, note: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundError('Character', id);

    const gs   = await db.gameSystem.findUnique({ where: { id: character.gameSystemId } });
    const slug = gs?.slug ?? '';

    if (slug === 'dnd5e') {
        const { rejectDnd5eCharacter } = await import('../dnd5e/approve-character.ts');
        return rejectDnd5eCharacter(id, note, actorId);
    }

    // Universal fallback
    return rejectCharacter(id, note, actorId);
}