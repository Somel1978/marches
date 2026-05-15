// shared/database/index.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['query','error','warn'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export * from '@prisma/client';

import { getAll    as getAllUsers  } from './dbapi/read/users/get-all.ts';
import { getById   as getUserById  } from './dbapi/read/users/get-by-id.ts';
import { createUser                } from './dbapi/write/users/create.ts';
import { updateUser                } from './dbapi/write/users/update.ts';
import { deleteUser                } from './dbapi/write/users/delete.ts';
import { setPassword               } from './dbapi/write/users/set-password.ts';
import { getAll              as getAllRoles           } from './dbapi/read/roles/get-all.ts';
import { getWithPermissions, getAllWithPermissions    } from './dbapi/read/roles/get-with-permissions.ts';
import { createRole                                  } from './dbapi/write/roles/create.ts';
import { updatePermissions, setUserRoles             } from './dbapi/write/roles/update-permissions.ts';
import { deleteRole                                  } from './dbapi/write/roles/delete.ts';
import { getResources, getResourceNames,
         getResourceNavVisibility                    } from './dbapi/read/platform/get-resources.ts';
import { getSettings, getSettingsMap                } from './dbapi/read/platform/get-settings.ts';
import { updateSetting, updateSettings              } from './dbapi/write/platform/update-setting.ts';
import { getPlatformMetrics                          } from './dbapi/analytics/get-platform-metrics.ts';
import { getUserGrowth                               } from './dbapi/analytics/get-user-growth.ts';
import { getAuditLogs                                } from './dbapi/read/audit/get-logs.ts';
import { registerUser                                } from './dbapi/transactions/register-user.ts';

export const users = { getAll: getAllUsers, getById: getUserById, create: createUser, update: updateUser, delete: deleteUser, setPassword };
export const roles = { getAll: getAllRoles, getWithPermissions, getAllWithPermissions, create: createRole, updatePermissions, setUserRoles, delete: deleteRole };
export const platform = { getResources, getResourceNames, getResourceNavVisibility, getSettings, getSettingsMap, updateSetting, updateSettings };
export const analytics = { getPlatformMetrics, getUserGrowth };
export const audit = { getLogs: getAuditLogs };
export const transactions = { registerUser };