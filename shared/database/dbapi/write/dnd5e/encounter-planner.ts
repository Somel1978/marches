// shared/database/dbapi/write/dnd5e/encounter-planner.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';
import { EPLANNER_DEFAULTS } from '../../read/dnd5e/eplanner-defaults.ts';

async function assertGameSystem(gameSystemId: string) {
    const gs = await db.gameSystem.findUnique({ where: { id: gameSystemId } });
    if (!gs) throw new NotFoundError('GameSystem', gameSystemId);
}

// ── CR → XP ───────────────────────────────────────────────────────────────────

export async function upsertEncounterXp(
    input: { gameSystemId: string; cr: number; xp: number },
    actorId?: string,
) {
    await assertGameSystem(input.gameSystemId);
    return db.$transaction(async (tx) => {
        const row = await tx.dnd5eEncounterXp.upsert({
            where:  { gameSystemId_cr: { gameSystemId: input.gameSystemId, cr: input.cr } },
            update: { xp: input.xp },
            create: input,
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: row });
        return row;
    });
}

export async function deleteEncounterXp(id: string, actorId?: string) {
    const row = await db.dnd5eEncounterXp.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Dnd5eEncounterXp', id);
    return db.$transaction(async (tx) => {
        await tx.dnd5eEncounterXp.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: row.gameSystemId, before: row });
    });
}

// ── Level thresholds ──────────────────────────────────────────────────────────

export async function upsertEncounterLevelThreshold(
    input: { gameSystemId: string; level: number; low: number; moderate: number; high: number },
    actorId?: string,
) {
    await assertGameSystem(input.gameSystemId);
    return db.$transaction(async (tx) => {
        const row = await tx.dnd5eEncounterLevelThreshold.upsert({
            where:  { gameSystemId_level: { gameSystemId: input.gameSystemId, level: input.level } },
            update: { low: input.low, moderate: input.moderate, high: input.high },
            create: input,
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: row });
        return row;
    });
}

export async function deleteEncounterLevelThreshold(id: string, actorId?: string) {
    const row = await db.dnd5eEncounterLevelThreshold.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Dnd5eEncounterLevelThreshold', id);
    return db.$transaction(async (tx) => {
        await tx.dnd5eEncounterLevelThreshold.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: row.gameSystemId, before: row });
    });
}

// ── Monster-count multipliers ─────────────────────────────────────────────────

export async function upsertEncounterMultiplier(
    input: { gameSystemId: string; minCount: number; multiplier: number },
    actorId?: string,
) {
    await assertGameSystem(input.gameSystemId);
    return db.$transaction(async (tx) => {
        const row = await tx.dnd5eEncounterMultiplier.upsert({
            where:  { gameSystemId_minCount: { gameSystemId: input.gameSystemId, minCount: input.minCount } },
            update: { multiplier: input.multiplier },
            create: input,
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: input.gameSystemId, after: row });
        return row;
    });
}

export async function deleteEncounterMultiplier(id: string, actorId?: string) {
    const row = await db.dnd5eEncounterMultiplier.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Dnd5eEncounterMultiplier', id);
    return db.$transaction(async (tx) => {
        await tx.dnd5eEncounterMultiplier.delete({ where: { id } });
        await logAudit(tx, { actorId, action: 'DELETE', resourceKey: 'GameSystem', resourceId: row.gameSystemId, before: row });
    });
}

// ── Config scalars ────────────────────────────────────────────────────────────

export async function updateEncounterConfig(
    input: {
        gameSystemId: string;
        moderateRatio: number;
        highRatio: number;
        extremeRatio: number;
        rewardGpRate: number;
        adventureDayMultiplier: number;
    },
    actorId?: string,
) {
    await assertGameSystem(input.gameSystemId);
    const { gameSystemId, ...scalars } = input;
    return db.$transaction(async (tx) => {
        const before = await tx.dnd5eEncounterConfig.findUnique({ where: { gameSystemId } });
        const row = await tx.dnd5eEncounterConfig.upsert({
            where:  { gameSystemId },
            update: scalars,
            create: { gameSystemId, ...scalars },
        });
        await logAudit(tx, { actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: gameSystemId, before, after: row });
        return row;
    });
}

// ── Reset ─────────────────────────────────────────────────────────────────────

// Replaces all encounter planner rows for the game system with the 2024 DMG defaults.
export async function resetEncounterPlanner(gameSystemId: string, actorId?: string) {
    await assertGameSystem(gameSystemId);
    return db.$transaction(async (tx) => {
        await tx.dnd5eEncounterXp.deleteMany({ where: { gameSystemId } });
        await tx.dnd5eEncounterLevelThreshold.deleteMany({ where: { gameSystemId } });
        await tx.dnd5eEncounterMultiplier.deleteMany({ where: { gameSystemId } });
        await tx.dnd5eEncounterConfig.deleteMany({ where: { gameSystemId } });

        await tx.dnd5eEncounterXp.createMany({
            data: EPLANNER_DEFAULTS.crToXp.map(r => ({ gameSystemId, ...r })),
        });
        await tx.dnd5eEncounterLevelThreshold.createMany({
            data: EPLANNER_DEFAULTS.levelThresholds.map(r => ({ gameSystemId, ...r })),
        });
        await tx.dnd5eEncounterMultiplier.createMany({
            data: EPLANNER_DEFAULTS.multipliers.map(r => ({ gameSystemId, ...r })),
        });
        await tx.dnd5eEncounterConfig.create({
            data: {
                gameSystemId,
                moderateRatio:          EPLANNER_DEFAULTS.moderateRatio,
                highRatio:              EPLANNER_DEFAULTS.highRatio,
                extremeRatio:           EPLANNER_DEFAULTS.extremeRatio,
                rewardGpRate:           EPLANNER_DEFAULTS.rewardGpRate,
                adventureDayMultiplier: EPLANNER_DEFAULTS.adventureDayMultiplier,
            },
        });

        await logAudit(tx, {
            actorId, action: 'UPDATE', resourceKey: 'GameSystem', resourceId: gameSystemId,
            after: { encounterPlanner: 'reset-to-defaults' },
        });
    });
}
