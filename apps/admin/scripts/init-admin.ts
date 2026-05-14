// apps/admin/scripts/init-admin.ts
//
// Creates the Account row for the seeded admin user using better-auth's own
// hashPassword from better-auth/crypto — guaranteed to match what better-auth
// uses at login time.
//
// Run once after db:seed:
//   pnpm --filter @apps/admin init-admin
//
import { db } from '@core/database';
import { hashPassword } from 'better-auth/crypto';
 
const ADMIN_EMAIL    = 'admin@marches.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
 
if (!ADMIN_PASSWORD) {
    console.error('Error: SEED_ADMIN_PASSWORD env var is required.');
    process.exit(1);
}
 
const user = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
if (!user) {
    console.error('User not found. Run pnpm --filter @core/database db:seed first.');
    process.exit(1);
}
 
const existing = await db.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
});
if (existing) {
    console.log('Account already exists for', ADMIN_EMAIL, '— nothing to do.');
    process.exit(0);
}
 
const hashed = await hashPassword(ADMIN_PASSWORD);
 
await db.account.create({
    data: {
        userId:     user.id,
        accountId:  user.id,
        providerId: 'credential',
        password:   hashed,
    },
});
 
console.log('✅ Admin account created for', ADMIN_EMAIL);
console.log('   You can now log in with this email and your SEED_ADMIN_PASSWORD.');