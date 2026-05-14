// shared/database/seeds/03-users.seed.ts

// �Users Seed (order: 03)
// Depends on: 02-roles.seed.ts (SUPERADMIN role must exist)
//
// Creates the User row and attaches the SUPERADMIN role.
// Does NOT create an Account row — run init-admin after seeding:
//   pnpm --filter @apps/admin init-admin
// 

import type { PrismaClient } from '@prisma/client';

export async function seedUsers(db: PrismaClient) {
    console.log('  └─ Seeding Users...');

    const adminRole = await db.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!adminRole) throw new Error('SUPERADMIN role not found. Run 02-roles.seed.ts first.');

    const ADMIN_EMAIL = 'admin@marches.local';

    const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
        console.log('     Admin user already exists, skipping.');
        return;
    }

    await db.user.create({
        data: {
            name:          'System Admin',
            email:         ADMIN_EMAIL,
            emailVerified: true,
            userRoles:     { create: { roleId: adminRole.id } },
        },
    });

    console.log('     Created admin user: ' + ADMIN_EMAIL);
    console.log('     Run: pnpm --filter @apps/admin init-admin to set the password.');
}
