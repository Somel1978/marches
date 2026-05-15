// shared/database/dbapi/transactions/register-user.ts

// Single transaction for creating a user with roles and account (password).
// This is the only entry point for user creation.

import { db } from '../../index.ts';
import { logAudit } from '../write/audit/log.ts';
import { hashPassword } from 'better-auth/crypto';
import { ConflictError, NotFoundError } from '@core/errors';

export type RegisterUserInput = {
    name:           string;
    email:          string;
    password:       string;
    discordHandle?: string;
    mobile?:        string;
    roleIds:        string[];
    createdBy?:     string;
};

export async function registerUser(input: RegisterUserInput) {
    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError(`User already exists: ${input.email}`);

    if (input.roleIds.length) {
        const found = await db.role.findMany({
            where:  { id: { in: input.roleIds } },
            select: { id: true },
        });
        if (found.length !== input.roleIds.length) {
            const missing = input.roleIds.filter(id => !found.map(r => r.id).includes(id));
            throw new NotFoundError('Role', missing.join(', '));
        }
    }

    const hashed = await hashPassword(input.password);

    return db.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name:          input.name,
                email:         input.email,
                discordHandle: input.discordHandle || undefined,
                mobile:        input.mobile        || undefined,
                emailVerified: false,
                createdBy:     input.createdBy,
                userRoles:     input.roleIds.length
                    ? { create: input.roleIds.map(roleId => ({ roleId, assignedBy: input.createdBy })) }
                    : undefined,
            },
        });

        await tx.account.create({
            data: {
                userId:     user.id,
                accountId:  user.id,
                providerId: 'credential',
                password:   hashed,
            },
        });

        await logAudit(tx, {
            actorId:     input.createdBy,
            action:      'CREATE',
            resourceKey: 'User',
            resourceId:  user.id,
            after:       { id: user.id, name: user.name, email: user.email },
        });

        return user;
    });
}