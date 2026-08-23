import { PrismaClient } from '@prisma/client';

/**
 * Serverless-safe Prisma client.
 *
 * On Vercel each warm invocation reuses the module scope, but a fresh module
 * scope is created per cold start and a dev-server reload re-imports the module.
 * Without the global cache, both leak a connection pool per instance and the
 * database runs out of connections long before it runs out of capacity.
 *
 * DATABASE_URL must point at Supabase's TRANSACTION POOLER (port 6543) with
 * `?pgbouncer=true&connection_limit=1`. The direct connection (5432) holds a
 * session per function instance and exhausts Postgres under any real traffic.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

// Cached in both environments: in dev to survive hot reloads, in serverless to
// survive warm invocations. The distinction other guides draw does not apply
// when the same module is re-imported per cold start.
globalForPrisma.prisma = prisma;
