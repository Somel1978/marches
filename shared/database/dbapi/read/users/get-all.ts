// shared/database/dbapi/read/users/get-all.ts
import { db } from '../../../index.ts';

export type GetAllUsersOptions = {
    search?:  string;
    page?:    number;
    perPage?: number;
};

export async function getAll({ search, page = 1, perPage = 20 }: GetAllUsersOptions = {}) {
    const where = search
        ? { OR: [
              { name:  { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
          ]}
        : {};

    const [items, total] = await db.$transaction([
        db.user.findMany({
            where,
            skip:    (page - 1) * perPage,
            take:    perPage,
            orderBy: { createdAt: 'desc' },
            select: {
                id:            true,
                name:          true,
                email:         true,
                emailVerified: true,
                image:         true,
                createdAt:     true,
                userRoles: {
                    select: { role: { select: { id: true, name: true } } },
                },
            },
        }),
        db.user.count({ where }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}
