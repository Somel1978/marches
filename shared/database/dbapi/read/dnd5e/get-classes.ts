// shared/database/dbapi/read/dnd5e/get-classes.ts
import { db } from '../../../index.ts';
import { getDnd5eFeats } from './get-feats.ts';

export async function getDnd5eClasses(gameSystemId: string) {
    return db.dnd5eClass.findMany({
        where:   { gameSystemId, isAvailable: true },
        include: {
            features:     { orderBy: { requiredLevel: 'asc' } },
            savingThrows: true,
            skillOptions: true,
            subclasses:   {
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
            features:     { orderBy: { requiredLevel: 'asc' } },
            savingThrows: true,
            skillOptions: true,
            subclasses:   {
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
        include: {
            grantsFeat:  { select: { id: true, name: true, description: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function getAllDnd5eBackgrounds(gameSystemId: string) {
    return db.dnd5eBackground.findMany({
        where:   { gameSystemId },
        orderBy: { sortOrder: 'asc' },
    });
}

// ── System data cache ─────────────────────────────────────────────────────────
// getDnd5eSystemData is called on every character page load and wizard visit.
// The data (classes/features/subclasses/species/backgrounds/feats) changes only
// when an admin runs an import — so a 5-minute server-side in-memory cache
// eliminates the heaviest query for the vast majority of requests.

const _systemDataCache = new Map<string, { data: any; ts: number }>();
const SYSTEM_DATA_TTL  = 5 * 60 * 1000; // 5 minutes

export function invalidateDnd5eSystemDataCache(gameSystemId?: string) {
    if (gameSystemId) _systemDataCache.delete(gameSystemId);
    else              _systemDataCache.clear();
}

// Get all dnd5e data for a game system in one call (for character sheet)
export async function getDnd5eSystemData(gameSystemId: string) {
    const hit = _systemDataCache.get(gameSystemId);
    if (hit && Date.now() - hit.ts < SYSTEM_DATA_TTL) return hit.data;

    const [classes, species, backgrounds, feats, spellSlotProgressions, spellsKnownProgressions, spells] = await Promise.all([
        getDnd5eClasses(gameSystemId),
        getDnd5eSpecies(gameSystemId),
        getDnd5eBackgrounds(gameSystemId),
        getDnd5eFeats(gameSystemId),
        db.dnd5eSpellSlotProgression.findMany({ where: { gameSystemId }, orderBy: [{ classId: 'asc' }, { classLevel: 'asc' }] }).catch(() => []),
        db.dnd5eSpellsKnownProgression.findMany({ where: { gameSystemId }, orderBy: [{ classId: 'asc' }, { classLevel: 'asc' }] }).catch(() => []),
        db.dnd5eSpell.findMany({ where: { gameSystemId, isLegacy: false }, orderBy: [{ level: 'asc' }, { name: 'asc' }] }).catch(() => []),
    ]);
    const data = { classes, species, backgrounds, feats, spellSlotProgressions, spellsKnownProgressions, spells };
    _systemDataCache.set(gameSystemId, { data, ts: Date.now() });
    return data;
}