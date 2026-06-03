// shared/database/dbapi/read/characters/get-by-id.ts
import { db } from '../../../index.ts';

// Universal character read — returns raw character with classes, inventory, and system sheet
// For enriched dnd5e sheet data (class names, species traits, features) use dnd5e.getCharacterSheet()
export async function getCharacterById(id: string) {
    return db.character.findUnique({
        where:   { id },
        include: {
            classes:    { orderBy: { allocatedLevel: 'desc' } },
            inventory:  true,
            dnd5eSheet: true,
        },
    });
}

export async function getCharactersByUserId(userId: string) {
    return db.character.findMany({
        where:   { userId },
        orderBy: { createdAt: 'asc' },
        include: {
            classes:    { orderBy: { allocatedLevel: 'desc' } },
            dnd5eSheet: true,
        },
    });
}