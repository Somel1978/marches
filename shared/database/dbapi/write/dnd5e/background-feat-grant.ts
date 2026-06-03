// shared/database/dbapi/write/dnd5e/background-feat-grant.ts
// Handles automatic feat grants from backgrounds (grantsFeatId).
// Called whenever a character's backgroundId changes.
import { db } from '../../../index.ts';

const BACKGROUND_SLOT_CLASS_ID = 'background';

export async function syncBackgroundFeatGrant(
    tx: any,
    characterId: string,
    newBackgroundId: string | null,
    oldBackgroundId: string | null,
) {
    if (newBackgroundId === oldBackgroundId) return;

    // Remove auto-granted feat from old background (if any)
    if (oldBackgroundId) {
        const oldBg = await tx.dnd5eBackground.findUnique({
            where:  { id: oldBackgroundId },
            select: { grantsFeatId: true },
        });
        if (oldBg?.grantsFeatId) {
            await tx.dnd5eCharacterFeat.deleteMany({
                where: {
                    characterId,
                    featId:       oldBg.grantsFeatId,
                    sourceClassId: BACKGROUND_SLOT_CLASS_ID,
                    sourceLevel:  1,
                },
            });
        }
    }

    // Auto-grant feat from new background (if any)
    if (newBackgroundId) {
        const newBg = await tx.dnd5eBackground.findUnique({
            where:  { id: newBackgroundId },
            select: { grantsFeatId: true, name: true },
        });
        if (newBg?.grantsFeatId) {
            // Upsert — ensure exactly one row for this slot
            await tx.dnd5eCharacterFeat.deleteMany({
                where: { characterId, sourceClassId: BACKGROUND_SLOT_CLASS_ID, sourceLevel: 1 },
            });
            await tx.dnd5eCharacterFeat.create({
                data: {
                    characterId,
                    featId:       newBg.grantsFeatId,
                    sourceClassId: BACKGROUND_SLOT_CLASS_ID,
                    sourceLevel:  1,
                },
            });
        }
    }
}
