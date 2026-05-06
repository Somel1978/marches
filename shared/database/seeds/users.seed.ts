import { type PrismaClient } from '@prisma/client';

export async function seedUsers(db: PrismaClient) {
  console.log('  └─ Seeding Users...');

  // 1. Get the Superadmin role id
  const adminRole = await db.role.findUnique({
    where: { name: 'SUPERADMIN' },
  });

  if (!adminRole) {
    throw new Error('SUPERADMIN role not found. Seed roles first!');
  }

  // 2. Create the initial Superadmin
  await db.user.upsert({
    where: { email: 'admin@marches.local' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@marches.local',
      emailVerified: true, 
      // In production, NEVER store plain text. 
      // Use: await argon2.hash('your-password')
      password: 'change-me-immediately', 
      discordHandle: 'admin#0001',
      roles: {
        connect: { id: adminRole.id },
      },
    },
  });
}
