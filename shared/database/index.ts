import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { prismaAdapter } from 'better-auth/adapters/prisma';
 
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
 
/**
 * Pre-configured better-auth database adapter.
 * Exported here so @core/rbac never imports from prisma or better-auth/adapters directly.
 */
export const betterAuthDbAdapter = prismaAdapter(db, { provider: 'postgresql' });
 
export * from '@prisma/client';
 