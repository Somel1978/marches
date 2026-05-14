// shared/database/index.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Re-export Prisma types — all consumers import from @core/database, never @prisma/client
export * from '@prisma/client';

// ── Namespaced dbapi ──────────────────────────────────────────────────────────
// Usage:
//   import { users, roles, platform, analytics, transactions } from '@core/database';
//   const user = await users.getById(id);
// ─────────────────────────────────────────────────────────────────────────────

import { getAll    as getAllUsers  } from './dbapi/read/users/get-all.ts';
import { getById   as getUserById  } from './dbapi/read/users/get-by-id.ts';
import { createUser                } from './dbapi/write/users/create.ts';
import { updateUser                } from './dbapi/write/users/update.ts';
import { deleteUser                } from './dbapi/write/users/delete.ts';

import { getAll              as getAllRoles           } from './dbapi/read/roles/get-all.ts';
import { getWithPermissions, getAllWithPermissions    } from './dbapi/read/roles/get-with-permissions.ts';
import { createRole                                  } from './dbapi/write/roles/create.ts';
import { updatePermissions, setUserRoles             } from './dbapi/write/roles/update-permissions.ts';
import { deleteRole                                  } from './dbapi/write/roles/delete.ts';

import { getResources, getResourceNames              } from './dbapi/read/platform/get-resources.ts';

import { getPlatformMetrics                          } from './dbapi/analytics/get-platform-metrics.ts';
import { getUserGrowth                               } from './dbapi/analytics/get-user-growth.ts';

import { registerUser                                } from './dbapi/transactions/register-user.ts';

export const users = {
    getAll:  getAllUsers,
    getById: getUserById,
    create:  createUser,
    update:  updateUser,
    delete:  deleteUser,
};

export const roles = {
    getAll:               getAllRoles,
    getWithPermissions,
    getAllWithPermissions,
    create:               createRole,
    updatePermissions,
    setUserRoles,
    delete:               deleteRole,
};

export const platform = {
    getResources,
    getResourceNames,
};

export const analytics = {
    getPlatformMetrics,
    getUserGrowth,
};

export const transactions = {
    registerUser,
};