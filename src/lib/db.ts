import { PrismaClient } from "@/generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function createPrismaClient(): PrismaClient {
  // 1. Cloudflare Workers / Pages runtime with Cloudflare D1 database binding
  try {
    const cf = getCloudflareContext?.();
    if (cf?.env?.DB) {
      const adapter = new PrismaD1(cf.env.DB as any);
      return new PrismaClient({ adapter });
    }
  } catch {
    // getCloudflareContext throws when not running inside Cloudflare runtime
  }

  // 2. Local dev / testing fallback
  return new PrismaClient({
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
