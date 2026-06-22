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
    const chars = await db.character.findMany({
        where:   { userId },
        orderBy: { createdAt: 'asc' },
        include: {
            classes:    { orderBy: { allocatedLevel: 'desc' } },
            dnd5eSheet: true,
        },
    });

    // Look up game system slugs separately (no direct relation on Character)
    const gsIds   = [...new Set(chars.map(c => c.gameSystemId))];
    const systems = gsIds.length
        ? await db.gameSystem.findMany({ where: { id: { in: gsIds } }, select: { id: true, slug: true } })
        : [];
    const slugMap = Object.fromEntries(systems.map(s => [s.id, s.slug]));

    // For dnd5e characters only, load class names via Dnd5eClass relation
    const dnd5eCharIds = chars
        .filter(c => slugMap[c.gameSystemId] === 'dnd5e')
        .map(c => c.id);

    const dnd5eClassRows = dnd5eCharIds.length
        ? await db.dnd5eCharacterClass.findMany({
            where:   { characterId: { in: dnd5eCharIds } },
            orderBy: { allocatedLevel: 'desc' },
        })
        : [];

    // Look up class names separately (no relation field on Dnd5eCharacterClass)
    const classIds  = [...new Set(dnd5eClassRows.map(cc => cc.classId))];
    const classRows = classIds.length
        ? await db.dnd5eClass.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
        : [];
    const classNameMap = Object.fromEntries(classRows.map(c => [c.id, c.name]));

    // Look up subclass names separately
    const subclassIds  = [...new Set(dnd5eClassRows.map(cc => cc.subclassId).filter(Boolean))] as string[];
    const subclassRows = subclassIds.length
        ? await db.dnd5eSubclass.findMany({ where: { id: { in: subclassIds } }, select: { id: true, name: true } })
        : [];
    const subclassNameMap = Object.fromEntries(subclassRows.map(s => [s.id, s.name]));

    const classesByChar: Record<string, { name: string; subclassName: string | null; allocatedLevel: number }[]> = {};
    for (const cc of dnd5eClassRows) {
        if (!classesByChar[cc.characterId]) classesByChar[cc.characterId] = [];
        classesByChar[cc.characterId].push({
            name:          classNameMap[cc.classId] ?? '',
            subclassName:  cc.subclassId ? (subclassNameMap[cc.subclassId] ?? null) : null,
            allocatedLevel: cc.allocatedLevel,
        });
    }

    return chars.map(c => ({
        ...c,
        gameSystemSlug: slugMap[c.gameSystemId] ?? null,
        // dnd5eClasses only populated for dnd5e characters — empty array for all others
        dnd5eClasses: slugMap[c.gameSystemId] === 'dnd5e' ? (classesByChar[c.id] ?? []) : [],
    }));
}