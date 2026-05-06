// shared/database/seed.ts
import { db } from './index.ts'; // Add the .ts extension
import { seedRoles } from './seeds/roles.seed.ts';
import { seedUsers } from './seeds/users.seed.ts';

async function main() {
  console.log('🌱 Starting Modular Seed Process...');

  try {
    // 1. Roles & Permissions (Foundation)
    await seedRoles(db);
    
    // 2. Users (Depends on Roles)
    await seedUsers(db);
    
    console.log('✅ All modules seeded successfully.');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
