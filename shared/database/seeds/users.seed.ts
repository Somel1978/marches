import { hash } from '@node-rs/argon2';
import type { PrismaClient } from '@prisma/client';

const ARGON2_OPTIONS = {
    memoryCost:  19456,
    timeCost:    2,
    outputLen:   32,
    parallelism: 1,
};

export async function seedUsers(db: PrismaClient) {
    console.log('  └─ Seeding Users...');

    const adminRole = await db.role.findUnique({ where: { name: 'SUPERADMIN' } });
    if (!adminRole) throw new Error('SUPERADMIN role not found. Run seedRoles first.');

    const ADMIN_EMAIL    = 'admin@marches.local';
    const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD env var is required to seed users.');

    const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
        console.log('     Admin user already exists, skipping.');
        return;
    }

    const hashedPassword = await hash(ADMIN_PASSWORD, ARGON2_OPTIONS);

    await db.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name:          'System Admin',
                email:         ADMIN_EMAIL,
                emailVerified: true,
                userRoles:     { create: { roleId: adminRole.id } },
            },
        });

        await tx.account.create({
            data: {
                userId:     user.id,
                accountId:  user.id,
                providerId: 'credential',
                password:   hashedPassword,
            },
        });
    });

    console.log('     Created admin user: ' + ADMIN_EMAIL);
    console.log('     ⚠  Change the password after first login.');
}