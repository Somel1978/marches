// shared/database/dbapi/read/dnd5e/get-classes.ts
import { db } from '../../../index.ts';
import { getDnd5eFeats } from './get-feats.ts';

export async function getDnd5eClasses(gameSystemId: string) {
    return db.dnd5eClass.findMany({
        where:   { gameSystemId, isAvailable: true },
        include: {
            features:   { orderBy: { requiredLevel: 'asc' } },
            subclasses: {
                where:   { isAvailable: true },
                orderBy: { sortOrder: 'asc' },
                include: { features: { orderBy: { requiredLevel: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllDnd5eClasses(gameSystemId: string) {
    return db.dnd5eClass.findMany({
        where:   { gameSystemId },
        include: {
            features:   { orderBy: { requiredLevel: 'asc' } },
            subclasses: {
                orderBy: { sortOrder: 'asc' },
                include: { features: { orderBy: { requiredLevel: 'asc' } } },
            },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getDnd5eClassById(id: string) {
    return db.dnd5eClass.findUnique({
        where:   { id },
        include: {
            features:   { orderBy: { requiredLevel: 'asc' } },
            subclasses: {
                orderBy: { sortOrder: 'asc' },
                include: { features: { orderBy: { requiredLevel: 'asc' } } },
            },
        },
    });
}

export async function getDnd5eSpecies(gameSystemId: string) {
    return db.dnd5eSpecies.findMany({
        where:   { gameSystemId, isAvailable: true },
        include: { traits: true },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllDnd5eSpecies(gameSystemId: string) {
    return db.dnd5eSpecies.findMany({
        where:   { gameSystemId },
        include: { traits: true },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getDnd5eBackgrounds(gameSystemId: string) {
    return db.dnd5eBackground.findMany({
        where:   { gameSystemId, isAvailable: true },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllDnd5eBackgrounds(gameSystemId: string) {
    return db.dnd5eBackground.findMany({
        where:   { gameSystemId },
        orderBy: { sortOrder: 'asc' },
    });
}

// Get all dnd5e data for a game system in one call (for character sheet)
export async function getDnd5eSystemData(gameSystemId: string) {
    const [classes, species, backgrounds, feats] = await Promise.all([
        getDnd5eClasses(gameSystemId),
        getDnd5eSpecies(gameSystemId),
        getDnd5eBackgrounds(gameSystemId),
        getDnd5eFeats(gameSystemId),
    ]);
    return { classes, species, backgrounds, feats };
}