// shared/database/seeds/04b-dnd5e.seed.ts
// D&D 5e content (classes, spells, etc.) is imported via Admin → Game Systems
// → Import. Only the encounter planner lookup tables are seeded here.

import type { PrismaClient } from '@prisma/client';
import { EPLANNER_DEFAULTS } from '../dbapi/read/dnd5e/eplanner-defaults.ts';

export async function seedDnd5e(db: PrismaClient) {
    console.log('  └─ D&D 5e: content via Admin Import; seeding encounter planner…');

    const gs = await db.gameSystem.findUnique({ where: { slug: 'dnd5e' } });
    if (!gs) {
        console.log('     dnd5e game system not found — skipping encounter planner seed.');
        return;
    }

    // Idempotent: only seed when the tables are empty for this game system.
    const existing = await db.dnd5eEncounterXp.count({ where: { gameSystemId: gs.id } });
    if (existing > 0) {
        console.log('     Encounter planner already seeded — skipping.');
        return;
    }

    await db.dnd5eEncounterXp.createMany({
        data: EPLANNER_DEFAULTS.crToXp.map(r => ({ gameSystemId: gs.id, ...r })),
    });
    await db.dnd5eEncounterLevelThreshold.createMany({
        data: EPLANNER_DEFAULTS.levelThresholds.map(r => ({ gameSystemId: gs.id, ...r })),
    });
    await db.dnd5eEncounterMultiplier.createMany({
        data: EPLANNER_DEFAULTS.multipliers.map(r => ({ gameSystemId: gs.id, ...r })),
    });
    await db.dnd5eEncounterConfig.create({
        data: {
            gameSystemId:           gs.id,
            moderateRatio:          EPLANNER_DEFAULTS.moderateRatio,
            highRatio:              EPLANNER_DEFAULTS.highRatio,
            extremeRatio:           EPLANNER_DEFAULTS.extremeRatio,
            rewardGpRate:           EPLANNER_DEFAULTS.rewardGpRate,
            adventureDayMultiplier: EPLANNER_DEFAULTS.adventureDayMultiplier,
        },
    });

    console.log(`     Encounter planner: ${EPLANNER_DEFAULTS.crToXp.length} CR rows, ${EPLANNER_DEFAULTS.levelThresholds.length} levels, ${EPLANNER_DEFAULTS.multipliers.length} multipliers seeded`);
}
