// shared/database/dbapi/read/quests/get-by-id.ts
import { db } from '../../../index.ts';

async function enrichSignups(signups: { characterId: string; id: string; status: any; signedUpAt: Date; updatedAt: Date; questId: string; cancelNote: string | null }[]) {
    if (!signups.length) return [];

    const characterIds = signups.map(s => s.characterId);

    const characters = await db.character.findMany({
        where:   { id: { in: characterIds } },
        include: { classes: { orderBy: { allocatedLevel: 'desc' } } },
    });

    const allClassIds    = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.classId)))];
    const allSubclassIds = [...new Set(characters.flatMap(c => c.classes.map(cc => cc.subclassId).filter(Boolean) as string[]))];
    const [classRecords, subclassRecords] = await Promise.all([
        allClassIds.length    ? db.class.findMany({ where: { id: { in: allClassIds } } })    : [],
        allSubclassIds.length ? db.subclass.findMany({ where: { id: { in: allSubclassIds } } }) : [],
    ]);
    const classMap    = Object.fromEntries(classRecords.map(c => [c.id, c]));
    const subclassMap = Object.fromEntries(subclassRecords.map(s => [s.id, s]));

    // Get species
    const speciesIds = characters.map(c => (c as any).speciesId).filter(Boolean) as string[];
    const speciesRecords = speciesIds.length
        ? await db.species.findMany({ where: { id: { in: speciesIds } } })
        : [];
    const speciesMap = Object.fromEntries(speciesRecords.map(s => [s.id, s.name]));

    // Get user names
    const userIds = [...new Set(characters.map(c => c.userId))];
    const users   = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const charMap = Object.fromEntries(characters.map(c => {
        const totalLevel = c.classes.reduce((s, cc) => s + cc.allocatedLevel, 0);
        const classes = c.classes.map(cc => ({
            name:        classMap[cc.classId]?.name ?? cc.classId,
            subclass:    cc.subclassId ? (subclassMap[cc.subclassId]?.name ?? null) : null,
            level:       cc.allocatedLevel,
        }));
        return [c.id, {
            id:          c.id,
            name:        c.name,
            avatarUrl:   c.avatarUrl,
            portraitUrl: c.portraitUrl,
            totalLevel,
            species:     c.speciesId ? (speciesMap[c.speciesId] ?? null) : null,
            classes,
            playerName:  userMap[c.userId] ?? c.userId,
        }];
    }));

    return signups.map(s => ({ ...s, character: charMap[s.characterId] ?? null }));
}

export async function getQuestById(id: string) {
    const quest = await db.quest.findUnique({
        where:   { id },
        include: {
            coDMs:   true,
            rewards: true,
            signups: { orderBy: { signedUpAt: 'asc' } },
            result:  { include: { characters: true } },
        },
    });
    if (!quest) return null;

    const enrichedSignups = await enrichSignups(quest.signups);
    return { ...quest, signups: enrichedSignups };
}

export async function getQuestsByDM(dmProfileId: string) {
    return db.quest.findMany({
        where:   {
            OR: [
                { dmProfileId },
                { coDMs: { some: { dmProfileId } } },
            ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
            rewards: true,
            signups: { where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] as any } } },
        },
    });
}