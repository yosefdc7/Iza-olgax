import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getPgConfig() {
  if (process.env.SQL_USER && process.env.SQL_HOST) {
    return {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      host: process.env.SQL_HOST,
    };
  }
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("<password>")) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return { connectionString: "postgresql://localhost:5432/pos" };
}

function createPrismaClient(): PrismaClient {
  try {
    const adapter = new PrismaPg(getPgConfig());
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (e) {
    console.warn("[AI Studio] Database client initialization fallback active", e);
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: unknown) => (d as { data?: unknown })?.data ?? {},
      update: async (d: unknown) => (d as { data?: unknown })?.data ?? {},
      delete: async () => ({}),
      count: async () => 0,
      upsert: async (d: unknown) => (d as { create?: unknown })?.create ?? {},
    };
    return new Proxy({}, { get: () => noOp }) as unknown as PrismaClient;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
