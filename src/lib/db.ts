import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(): PrismaClient {
  // 1. Cloudflare Workers / Pages runtime with Cloudflare D1 database binding
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const cf = getCloudflareContext?.();
    if (cf?.env?.DB) {
      const { PrismaD1 } = require("@prisma/adapter-d1");
      const adapter = new PrismaD1(cf.env.DB);
      return new PrismaClient({ adapter });
    }
  } catch {
    // Not running inside Cloudflare Workers
  }

  // 2. Local dev & Vitest test runner (uses local SQLite file via @prisma/adapter-libsql)
  try {
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const url = process.env.DATABASE_URL || "file:./dev.db";
    const adapter = new PrismaLibSql({ url });
    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  } catch (err) {
    console.error("Failed to initialize database adapter:", err);
    throw err;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
