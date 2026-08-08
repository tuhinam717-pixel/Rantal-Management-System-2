import { PrismaClient } from "@prisma/client";

// Next.js hot-reloads modules in dev, which would otherwise open a new pool on
// every reload. Cache the client on globalThis.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Options for the multi-step interactive transactions (checkout, return
 * settlement, quotation confirmation).
 *
 * Prisma defaults to a 5s transaction timeout, which is fine against a local
 * database but not against a pooled serverless Postgres: every statement pays
 * network latency, and a suspended Neon compute adds a cold start on top. The
 * settlement transaction was intermittently dying with P2028 as a result.
 */
export const LONG_TRANSACTION = {
  maxWait: 15_000,
  timeout: 30_000,
} as const;
