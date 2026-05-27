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
    return enrichCharacter(character);
}

export async function getCharactersByUserId(userId: string) {
    const characters = await db.character.findMany({
        where:   { userId },
        orderBy: { createdAt: 'asc' },
        include: { classes: { orderBy: { allocatedLevel: 'desc' } } },
    });
    return Promise.all(characters.map(enrichCharacter));
}

async function enrichCharacter(character: any) {
    const classIds    = character.classes.map((c: any) => c.classId);
    const subclassIds = character.classes.map((c: any) => c.subclassId).filter(Boolean) as string[];

    const [classRecords, subclassRecords, speciesRecord, backgroundRecord] = await Promise.all([
        classIds.length    ? db.dnd5eClass.findMany({
            where:   { id: { in: classIds } },
            include: { features: { orderBy: { requiredLevel: 'asc' } } },
        }) : [],
        subclassIds.length ? db.dnd5eSubclass.findMany({
            where:   { id: { in: subclassIds } },
            include: { features: { orderBy: { requiredLevel: 'asc' } } },
        }) : [],
        character.speciesId    ? db.dnd5eSpecies.findUnique({ where: { id: character.speciesId }, include: { traits: true } }) : null,
        (character as any).backgroundId ? db.dnd5eBackground.findUnique({ where: { id: (character as any).backgroundId } }) : null,
    ]);

    const classMap    = Object.fromEntries((classRecords as any[]).map((c: any) => [c.id, c]));
    const subclassMap = Object.fromEntries((subclassRecords as any[]).map((s: any) => [s.id, s]));

    const enrichedClasses = character.classes.map((cc: any) => {
        const classRef    = classMap[cc.classId]    ?? null;
        const subclassRef = cc.subclassId ? (subclassMap[cc.subclassId] ?? null) : null;

        // Features up to allocatedLevel
        const classFeatures    = classRef?.features?.filter((f: any) => f.requiredLevel <= cc.allocatedLevel)    ?? [];
        const subclassFeatures = subclassRef?.features?.filter((f: any) => f.requiredLevel <= cc.allocatedLevel) ?? [];

        return { ...cc, classRef, subclassRef, classFeatures, subclassFeatures };
    });

    return {
        ...character,
        classes:    enrichedClasses,
        speciesRef: speciesRecord,
        backgroundRef: backgroundRecord,
    };
}