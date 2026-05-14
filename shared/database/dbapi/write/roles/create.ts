// shared/database/dbapi/write/roles/create.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { ConflictError } from '@core/errors';

export type CreateRoleInput = {
    name:         string;
    description?: string;
    actorId?:     string;
};

export async function createRole(input: CreateRoleInput) {
    const existing = await db.role.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`Role already exists: ${input.name}`);

    return db.$transaction(async (tx) => {
        const role = await tx.role.create({
            data: { name: input.name, description: input.description },
        });

        await logAudit(tx, {
            actorId:     input.actorId,
            action:      'CREATE',
            resourceKey: 'Role',
            resourceId:  role.id,
            after:       role,
        });

        return role;
    });
}