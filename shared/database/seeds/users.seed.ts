import type { PrismaClient } from '@prisma/client';

/**
 * Seeds a placeholder admin user with the SUPERADMIN role.
 *
 * NOTE: this only creates the User row and connects the role.
 * It does NOT create an Account row, so this user cannot log in yet.
 * After seeding, create the account through the admin app UI or via
 * the app-level seed script (which has access to @core/rbac and can
 * call auth.api.signUpEmail with proper password hashing).
 *
 * @core/database must never depend on @core/rbac — the dependency
 * direction is strictly: apps → @core/rbac → @core/database.
 */
export async function seedUsers(db: PrismaClient) {
    console.log('  └─ Seeding Users...');

    const adminRole = await db.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!adminRole) throw new Error('SUPERADMIN role not found. Run seedRoles first.');

    const ADMIN_EMAIL = 'admin@marches.local';

    await db.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},
        create: {
            name:          'System Admin',
            email:         ADMIN_EMAIL,
            emailVerified: false,
            // TODO: User.password is currently required but better-auth stores
            // its hash in Account.password, not here. This field should be made
            // optional (String?) in users.prisma once that decision is resolved.
            // Empty string is a safe placeholder — this user cannot authenticate
            // until a proper Account row is created via the app.
            password:      '',
            userRoles: { create: { roleId: adminRole.id } },
        },
    });

    console.log(`     Upserted placeholder admin user: ${ADMIN_EMAIL}`);
    console.log(`     ⚠  Complete setup by registering this email through the admin app.`);
}