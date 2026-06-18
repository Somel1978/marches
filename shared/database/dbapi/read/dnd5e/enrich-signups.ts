// shared/database/dbapi/read/dnd5e/enrich-signups.ts
// Enriches quest signup character data with dnd5e display info (class names, species)
import { db } from '../../../index.ts';

export async function enrichDnd5eSignups(signups: { characterId: string; id: string; status: any; signedUpAt: Date; updatedAt: Date; questId: string; cancelNote: string | null }[]) {
    if (!signups.length) return [];

    const characterIds = signups.map(s => s.characterId);

    const characters = await db.character.findMany({
        where:   { id: { in: characterIds } },
        include: { classes: { orderBy: { allocatedLevel: 'desc' } }, dnd5eSheet: true },
    });

    const allClassIds    = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.classId)))];
    const allSubclassIds = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.subclassId).filter(Boolean) as string[]))];
    const speciesIds     = [...new Set(characters.map(c => (c as any).dnd5eSheet?.speciesId).filter(Boolean) as string[])];

    const [classRecords, subclassRecords, speciesRecords] = await Promise.all([
        allClassIds.length    ? db.dnd5eClass.findMany({ where: { id: { in: allClassIds } } })    : [],
        allSubclassIds.length ? db.dnd5eSubclass.findMany({ where: { id: { in: allSubclassIds } } }) : [],
        speciesIds.length     ? db.dnd5eSpecies.findMany({ where: { id: { in: speciesIds } } })   : [],
    ]);

    const classMap    = Object.fromEntries(classRecords.map((c: any) => [c.id, c]));
    const subclassMap = Object.fromEntries(subclassRecords.map((s: any) => [s.id, s]));
    const speciesMap  = Object.fromEntries(speciesRecords.map((s: any) => [s.id, s.name]));

    const userIds = [...new Set(characters.map(c => c.userId))];
    const users   = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const charMap = Object.fromEntries(characters.map(c => {
        const classes = (c.classes as any[]).map((cc: any) => ({
            name:     (classMap as any)[cc.classId]?.name ?? cc.classId,
            subclass: cc.subclassId ? ((subclassMap as any)[cc.subclassId]?.name ?? null) : null,
            level:    cc.allocatedLevel,
        }));
        const speciesId = (c as any).dnd5eSheet?.speciesId;
        return [c.id, {
            id:          c.id,
            name:        c.name,
            avatarUrl:   c.avatarUrl,
            portraitUrl: c.portraitUrl,
            totalLevel:  (c as any).level ?? 0,
            species:     speciesId ? ((speciesMap as any)[speciesId] ?? null) : null,
            classes,
            playerName:  userMap[c.userId] ?? c.userId,
        }];
    }));

    return signups.map(s => ({
        ...s,
        character: charMap[s.characterId] ?? {
            id:          s.characterId,
            name:        'Deleted Character',
            avatarUrl:   null,
            portraitUrl: null,
            totalLevel:  0,
            classes:     [],
            species:     null,
            playerName:  'Unknown Player',
        }
    }));
}