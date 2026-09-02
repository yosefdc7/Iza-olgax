import { PrismaClient } from "@/generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Safe mock D1 database for build-time static evaluation
const buildTimeMockD1: any = {
  prepare: (query: string) => ({
    bind: () => buildTimeMockD1.prepare(query),
    all: async () => ({ results: [], success: true, meta: {} }),
    run: async () => ({ success: true, meta: {} }),
    first: async () => null,
    raw: async () => [],
  }),
  batch: async () => [],
  exec: async () => ({ count: 0, duration: 0 }),
  dump: async () => new ArrayBuffer(0),
};

function createPrismaClient(): PrismaClient {
  let d1Database: any = undefined;

  try {
    const cf = getCloudflareContext?.();
    d1Database = (cf?.env as any)?.DB;
  } catch {
    // getCloudflareContext is not available during build/dev
  }

  // Use active D1 database or fallback mock for build-time static analysis
  const adapter = new PrismaD1(d1Database || buildTimeMockD1);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
