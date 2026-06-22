// shared/database/dbapi/write/users/update.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError } from '@core/errors';

export type UpdateUserInput = {
    name?:          string;
    email?:         string;
    image?:         string;
    discordHandle?: string;
    mobile?:        string;
    emailVerified?: boolean;
    actorId?:       string;
};

export async function updateUser(id: string, input: UpdateUserInput) {
    const before = await db.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('User', id);

    return db.$transaction(async (tx) => {
        const after = await tx.user.update({
            where: { id },
            data: {
                name:          input.name,
                // Explicitly null when empty string — allows clearing optional fields
                image:         input.image         !== undefined ? (input.image         || null) : undefined,
                discordHandle: input.discordHandle  !== undefined ? (input.discordHandle  || null) : undefined,
                mobile:        input.mobile         !== undefined ? (input.mobile         || null) : undefined,
                emailVerified: input.emailVerified,
                updatedBy:     input.actorId,
            },
        });

        await logAudit(tx, {
            actorId:     input.actorId,
            action:      'UPDATE',
            resourceKey: 'User',
            resourceId:  id,
            before:      { name: before.name, email: before.email, image: before.image, discordHandle: before.discordHandle, mobile: before.mobile },
            after:       { name: after.name,  email: after.email,  image: after.image,  discordHandle: after.discordHandle,  mobile: after.mobile  },
        });

        return after;
    });
}

export async function updateUserDiscord(id: string, discordId: string | null, discordHandle: string | null) {
    return db.user.update({ where: { id }, data: { discordId, discordHandle } });
}

export async function updateUserTheme(id: string, theme: string) {
    return db.user.update({ where: { id }, data: { theme } });
}