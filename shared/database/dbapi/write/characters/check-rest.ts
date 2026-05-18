// shared/database/dbapi/write/characters/check-rest.ts
// Lazy rest evaluation — called on character load to auto-clear expired rest.
import { db } from '../../../index.ts';

export async function checkAndClearRest(characterId: string) {
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (!character) return;
    if (character.status !== 'RESTING') return;
    if (character.statusReason !== 'QUEST_REST') return;
    if (!character.restUntil) return;
    if (new Date() < character.restUntil) return;

    // Rest period expired — set back to ACTIVE
    await db.character.update({
        where: { id: characterId },
        data: {
            status:          'ACTIVE',
            statusReason:    null,
            statusChangedAt: new Date(),
            restUntil:       null,
        },
    });

    await db.characterTransaction.create({
        data: {
            characterId,
            type:       'STATUS',
            fromValue:  'RESTING',
            toValue:    'ACTIVE',
            sourceType: 'SYSTEM',
            note:       'Rest period expired',
            createdBy:  'system',
        },
    });
}
