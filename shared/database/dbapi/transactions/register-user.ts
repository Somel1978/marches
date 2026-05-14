// shared/database/dbapi/transactions/register-user.ts

// Creates a User row and attaches roles atomically.
// Does NOT create an Account row âdone via better-auth at the app layer.

import { db } from '../../index.ts';

export type RegisterUserInput = {
    name:       string;
    email:      string;
    roleNames:  string[];
    createdBy?: string;
};

export async function registerUser(input: RegisterUserInput) {
    return db.$transaction(async (tx) => {
        const roles = await tx.role.findMany({ where: { name: { in: input.roleNames } } });

        if (roles.length !== input.roleNames.length) {
            const missing = input.roleNames.filter(n => !roles.map(r => r.name).includes(n));
            throw new Error(`Roles not found: ${missing.join(', ')}`);
        }

        return tx.user.create({
            data: {
                name:          input.name,
                email:         input.email,
                emailVerified: false,
                createdBy:     input.createdBy,
                userRoles: { create: roles.map(r => ({ roleId: r.id, assignedBy: input.createdBy })) },
            },
        });
    });
}
