// shared/database/dbapi/read/dnd5e/get-spells.ts
import { db } from '../../../index.ts';

export async function getAllDnd5eSpells(gameSystemId: string) {
    return db.dnd5eSpell.findMany({
        where: { gameSystemId },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
}

export async function getDnd5eSpellById(id: number) {
    return db.dnd5eSpell.findUnique({ where: { id } });
}

export async function getDnd5eSpellsForCharacter(gameSystemId: string, classNames: string[]) {
    // Returns spells whose spellList contains any of the given class names
    const all = await db.dnd5eSpell.findMany({
        where: { gameSystemId, isLegacy: false },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    if (!classNames.length) return all;
    return all.filter(s => {
        if (!s.spellList) return false;
        const list = s.spellList.split(',').map(n => n.trim().toLowerCase());
        return classNames.some(cn => list.includes(cn.toLowerCase()));
    });
}

export async function getDnd5eSpellSlotProgressions(gameSystemId: string) {
    return db.dnd5eSpellSlotProgression.findMany({
        where: { gameSystemId },
        orderBy: [{ classId: 'asc' }, { classLevel: 'asc' }],
    });
}

export async function getDnd5eSpellSlotProgressionByClass(gameSystemId: string, classId: string) {
    return db.dnd5eSpellSlotProgression.findMany({
        where: { gameSystemId, classId },
        orderBy: { classLevel: 'asc' },
    });
}

export async function getDnd5eSpellsKnownProgressions(gameSystemId: string) {
    return db.dnd5eSpellsKnownProgression.findMany({
        where: { gameSystemId },
        orderBy: [{ classId: 'asc' }, { classLevel: 'asc' }],
    });
}

export async function getDnd5eSpellsKnownProgressionByClass(gameSystemId: string, classId: string) {
    return db.dnd5eSpellsKnownProgression.findMany({
        where: { gameSystemId, classId },
        orderBy: { classLevel: 'asc' },
    });
}

export async function getDnd5eSpellbooks(characterId: string) {
    return db.dnd5eSpellbook.findMany({
        where: { characterId },
        include: { entries: true },
        orderBy: { createdAt: 'asc' },
    });
}
