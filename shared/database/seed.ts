// shared/database/seed.ts
import { db } from './index.ts';
import { seedPlatform  } from './seeds/01-platform.seed.ts';
import { seedRoles     } from './seeds/02-roles.seed.ts';
import { seedUsers     } from './seeds/03-users.seed.ts';
import { seedGameSystems } from './seeds/04-gamesystem.seed.ts';
import { seedDMs          } from './seeds/05-dms.seed.ts';
import { seedQuests      } from './seeds/06-quests.seed.ts';
import { seedMarketplace } from './seeds/07-marketplace.seed.ts';
import { seedWorld      } from './seeds/08-world.seed.ts';

async function main() {
    console.log('Seeding database...');
    await seedPlatform(db);
    await seedRoles(db);
    await seedUsers(db);
    await seedGameSystems(db);
    await seedDMs(db);
    await seedQuests(db);
    await seedMarketplace(db);
    await seedWorld(db);
    console.log('Done.');
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());