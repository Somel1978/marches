// shared/database/dbapi/read/characters/get-by-id.ts
import { db } from '../../../index.ts';

export async function getCharacterById(id: string) {
    const character = await db.character.findUnique({
        where:   { id },
        include: {
            classes:   { orderBy: { allocatedLevel: 'desc' } },
            inventory: true,
        },
    });
    if (!character) return null;

    // Enrich classes with class/subclass names (cross-schema — Prisma can't join directly)
    const classIds    = character.classes.map(c => c.classId);
    const subclassIds = character.classes.map(c => c.subclassId).filter(Boolean) as string[];

    const [classRecords, subclassRecords] = await Promise.all([
        classIds.length    ? db.class.findMany({ where: { id: { in: classIds } } })    : [],
        subclassIds.length ? db.subclass.findMany({ where: { id: { in: subclassIds } } }) : [],
    ]);

    const classMap    = Object.fromEntries(classRecords.map(c => [c.id, c]));
    const subclassMap = Object.fromEntries(subclassRecords.map(s => [s.id, s]));

    return {
        ...character,
        classes: character.classes.map(cc => ({
            ...cc,
            classRef:    classMap[cc.classId]    ?? null,
            subclassRef: cc.subclassId ? (subclassMap[cc.subclassId] ?? null) : null,
        })),
    };
}

export async function getCharactersByUserId(userId: string) {
    const characters = await db.character.findMany({
        where:   { userId },
        orderBy: { createdAt: 'asc' },
        include: { classes: { orderBy: { allocatedLevel: 'desc' } } },
    });

    // Enrich all characters' classes with names
    const allClassIds    = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.classId)))];
    const allSubclassIds = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.subclassId).filter(Boolean) as string[]))];

    const [classRecords, subclassRecords] = await Promise.all([
        allClassIds.length    ? db.class.findMany({ where: { id: { in: allClassIds } } })    : [],
        allSubclassIds.length ? db.subclass.findMany({ where: { id: { in: allSubclassIds } } }) : [],
    ]);

    const classMap    = Object.fromEntries(classRecords.map(c => [c.id, c]));
    const subclassMap = Object.fromEntries(subclassRecords.map(s => [s.id, s]));

    return characters.map(char => ({
        ...char,
        classes: char.classes.map(cc => ({
            ...cc,
            classRef:    classMap[cc.classId]    ?? null,
            subclassRef: cc.subclassId ? (subclassMap[cc.subclassId] ?? null) : null,
        })),
    }));
}