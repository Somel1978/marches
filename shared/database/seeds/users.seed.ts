// shared/database/seeds/users.seed.ts
import type { PrismaClient } from '@prisma/client';

export async function seedUsers(db: PrismaClient) {
    console.log('  \u2514\u2500 Seeding Users...');

    const adminRole = await db.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!adminRole) throw new Error('SUPERADMIN role not found. Run seedRoles first.');

    const ADMIN_EMAIL = 'admin@marches.local';

    const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
        console.log('     Admin user already exists, skipping.');
        return;
    }

    // Create the User row and attach the SUPERADMIN role.
    // The Account row (hashed password) must be created separately via the
    // init-admin script in apps/admin, which uses auth.api.signUpEmail to
    // guarantee the hash format matches better-auth's internal implementation.
    await db.user.create({
        data: {
            name:          'System Admin',
            email:         ADMIN_EMAIL,
            emailVerified: true,
            userRoles:     { create: { roleId: adminRole.id } },
        },
    });

    console.log('     Created admin user: ' + ADMIN_EMAIL);
    console.log('     \u26a0  Run: pnpm --filter @apps/admin init-admin to set the password.');
}