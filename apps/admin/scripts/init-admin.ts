// apps/admin/scripts/init-admin.ts
//
// Creates the Account row for the seeded admin user using better-auth's own
// auth.api.signUpEmail — this guarantees the password hash format matches
// what better-auth expects at login time.
//
// Run once after db:seed:
//   pnpm --filter @apps/admin init-admin
//
import { db } from '@core/database';
import { createAuth } from '@core/rbac';

const ADMIN_EMAIL    = 'admin@marches.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error('Error: SEED_ADMIN_PASSWORD env var is required.');
    process.exit(1);
}

const auth = createAuth({
    baseURL: process.env.ORIGIN ?? 'http://localhost:5173',
    secret:  process.env.BETTER_AUTH_SECRET ?? '',
});

// Check if Account row already exists
const existing = await db.account.findFirst({
    where: { user: { email: ADMIN_EMAIL }, providerId: 'credential' },
});

if (existing) {
    console.log('Account already exists for', ADMIN_EMAIL);
    process.exit(0);
}

// Get the pre-seeded user
const user = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
if (!user) {
    console.error('User not found. Run db:seed first.');
    process.exit(1);
}

// Use better-auth's signUpEmail to create the Account with a correctly
// hashed password. This may also create a duplicate User row — we delete
// that duplicate and keep the seeded one which already has the role attached.
await auth.api.signUpEmail({
    body: {
        email:    ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name:     user.name,
    },
});

// signUpEmail creates a new User row — find and delete it, keep the original
const duplicate = await db.user.findFirst({
    where: {
        email: ADMIN_EMAIL,
        NOT: { id: user.id },
    },
});

if (duplicate) {
    // Move the Account row from duplicate to the original seeded user
    await db.account.updateMany({
        where: { userId: duplicate.id },
        data:  { userId: user.id },
    });
    await db.user.delete({ where: { id: duplicate.id } });
}

console.log('✅ Admin account created for', ADMIN_EMAIL);
console.log('   You can now log in with this email and your SEED_ADMIN_PASSWORD.');