// shared/database/dbapi/write/users/set-password.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { hashPassword } from 'better-auth/crypto';
import { NotFoundError } from '@core/errors';

export async function setPassword(userId: string, plainPassword: string, actorId?: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    const hashed = await hashPassword(plainPassword);

    return db.$transaction(async (tx) => {
        // Prisma generates composite key name from field names: accountId + providerId
        await tx.account.upsert({
            where: {
                accountId_providerId: {
                    accountId:  userId,
                    providerId: 'credential',
                },
            },
            update: { password: hashed },
            create: {
                userId,
                accountId:  userId,
                providerId: 'credential',
                password:   hashed,
            },
        });

        await logAudit(tx, {
            actorId,
            action:      'UPDATE',
            resourceKey: 'User',
            resourceId:  userId,
            after:       { passwordReset: true },
        });
    });
}