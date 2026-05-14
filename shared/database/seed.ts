// shared/database/seed.ts

// ── Seed Execution Order ──────────────────────────────────────────────────────
// Mirrors schema dependency order exactly:
//
//   01-platform  schema: platform — no deps, must exist first so role
//                permissions can reference resource names
//
//   02-roles     schema: users — references platform.Resource names
//
//   03-users     schema: users — references roles from 02
//
// auth schema is not seeded — better-auth owns it entirely.
//
// When adding a new feature:
//   1. Add its .prisma file (schema 04+) and run db:generate + db:push
//   2. Add resources to 01-platform.seed.ts
//   3. Add a seed file as 04-<feature>.seed.ts
//   4. Import and call it here after 03-users
//
// Never change the order of existing seed calls.
// ─────────────────────────────────────────────────────────────────────────────

import { db }             from './index.ts';
import { seedPlatform }   from './seeds/01-platform.seed.ts';
import { seedRoles }      from './seeds/02-roles.seed.ts';
import { seedUsers }      from './seeds/03-users.seed.ts';

async function main() {
    console.log('🌱 Starting Modular Seed Process...');

    await seedPlatform(db);
    await seedRoles(db);
    await seedUsers(db);

    console.log('✅ All modules seeded successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });