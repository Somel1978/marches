// shared/database/seeds/04-gamesystem.seed.ts

// ── Game System Seed (order: 04) ──────────────────────────────────────────────
// Seeds default game systems. Admin builds classes/subclasses/progression
// from the admin panel — no class data seeded here.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';

const GAME_SYSTEMS = [
    {
        name:        'D&D 5e',
        description: 'Dungeons & Dragons 5th Edition',
        sortOrder:   0,
    },
    {
        name:        'Daggerheart',
        description: 'Daggerheart by Darrington Press',
        sortOrder:   1,
    },
    {
        name:        'Vampire: The Masquerade',
        description: 'Vampire: The Masquerade 5th Edition',
        sortOrder:   2,
    },
];

export async function seedGameSystems(db: PrismaClient) {
    console.log('  └─ Seeding Game Systems...');
    for (const gs of GAME_SYSTEMS) {
        await db.gameSystem.upsert({
            where:  { name: gs.name },
            update: {},
            create: gs,
        });
    }
    console.log(`     Game Systems: ${GAME_SYSTEMS.length} seeded`);
}
