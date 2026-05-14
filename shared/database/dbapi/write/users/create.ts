// shared/database/dbapi/write/users/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ConflictError } from '@core/errors';

export type CreateUserInput = {
    name:           string;
    email:          string;
    image?:         string;
    discordHandle?: string;
    mobile?:        string;
    roleIds?:       string[];
    actorId?:       string;
};

export async function createUser(input: CreateUserInput) {
    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError(`User already exists: ${input.email}`);

    return db.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name:          input.name,
                email:         input.email,
                image:         input.image,
                discordHandle: input.discordHandle,
                mobile:        input.mobile,
                createdBy:     input.actorId,
                emailVerified: false,
                userRoles:     input.roleIds?.length
                    ? { create: input.roleIds.map(roleId => ({ roleId, assignedBy: input.actorId })) }
                    : undefined,
            },
        });

        await logAudit(tx, {
            actorId:     input.actorId,
            action:      'CREATE',
            resourceKey: 'User',
            resourceId:  user.id,
            after:       { id: user.id, name: user.name, email: user.email },
        });

        return user;
    });
}