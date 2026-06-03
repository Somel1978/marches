// shared/database/dbapi/write/dnd5e/approve-character.ts
import { db, Prisma } from '../../../index.ts';
import { approveCharacter, rejectCharacter } from '../characters/approve.ts';

// Apply dnd5e pending changes (classes, species, background) then approve
export async function approveDnd5eCharacter(id: string, actorId: string) {
    const character = await db.character.findUnique({ where: { id }, include: { classes: true, dnd5eSheet: true } });
    if (!character) throw new Error(`Character ${id} not found`);

    const sheet   = (character as any).dnd5eSheet;
    const pending = sheet?.pendingChanges as any ?? null;
    let newLevel  = character.level;

    if (pending) {
        await db.$transaction(async (tx) => {
            if (pending.classes) {
                const classMap = new Map<string, any>();
                for (const c of pending.classes) classMap.set(c.classId, c);
                const deduped = Array.from(classMap.values());
                newLevel = deduped.reduce((s: number, c: any) => s + (c.allocatedLevel ?? 0), 0);

                await tx.dnd5eCharacterClass.deleteMany({ where: { characterId: id } });
                await tx.dnd5eCharacterClass.createMany({
                    data: deduped.map((c: any) => ({
                        characterId:    id,
                        classId:        c.classId,
                        subclassId:     c.subclassId ?? null,
                        allocatedLevel: c.allocatedLevel,
                    })),
                });
            }

            if (sheet) {
                await tx.dnd5eCharacterSheet.update({
                    where: { characterId: id },
                    data: {
                        ...(pending.speciesId    !== undefined && { speciesId:    pending.speciesId    }),
                        ...(pending.backgroundId !== undefined && { backgroundId: pending.backgroundId }),
                        pendingChanges: Prisma.JsonNull,
                    },
                });
            }

            // Apply universal pending fields (worldId, isGlobal) directly on character
            if (pending.worldId !== undefined || pending.isGlobal !== undefined) {
                await tx.character.update({
                    where: { id },
                    data: {
                        ...(pending.worldId  !== undefined && { worldId:  pending.worldId  }),
                        ...(pending.isGlobal !== undefined && { isGlobal: pending.isGlobal }),
                    },
                });
            }
        });
    }

    // Delegate universal approval (status, audit, notifications)
    return approveCharacter(id, actorId, newLevel);
}

// Clear dnd5e pendingChanges then reject
export async function rejectDnd5eCharacter(id: string, note: string, actorId: string) {
    const sheet = await db.dnd5eCharacterSheet.findUnique({ where: { characterId: id } });
    if (sheet) {
        await db.dnd5eCharacterSheet.update({ where: { characterId: id }, data: { pendingChanges: Prisma.JsonNull } });
    }
    return rejectCharacter(id, note, actorId);
}