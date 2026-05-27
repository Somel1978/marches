// shared/database/seeds/04-gamesystem.seed.ts

// ── Game System Seed (order: 04) ──────────────────────────────────────────────
// Seeds default game systems. Admin builds classes/subclasses/progression
// from the admin panel — no class data seeded here.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';

const GAME_SYSTEMS = [
    { name: 'D&D 5e',                  slug: 'dnd5e',       description: 'Dungeons & Dragons 5th Edition'      },
    { name: 'Daggerheart',             slug: 'daggerheart', description: 'Daggerheart by Darrington Press'      },
    { name: 'Vampire: The Masquerade', slug: 'vtm5e',       description: 'Vampire: The Masquerade 5th Edition' },
];

export async function seedGameSystems(db: PrismaClient) {
    console.log('  └─ Seeding Game Systems...');
    for (const gs of GAME_SYSTEMS) {
        await db.gameSystem.upsert({
            where:  { name: gs.name },
            update: { slug: gs.slug },
            create: gs,
        });
    }
    console.log(`     Game Systems: ${GAME_SYSTEMS.length} seeded`);
}