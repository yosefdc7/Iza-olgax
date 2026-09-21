import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface SetupStatus {
  envOk: boolean;
  dbConnected: boolean;
  dbInitialized: boolean;
  hasAdmin: boolean;
  hasReceiptSeries: boolean;
  setupComplete: boolean;
  missingEnv: string[];
  dbError?: string; // human-readable DB error surfaced to wizard UI
}

async function probeDb(): Promise<{
  connected: boolean;
  initialized: boolean;
  hasAdmin: boolean;
  hasReceiptSeries: boolean;
  setupComplete: boolean;
  error?: string;
}> {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
      select: { setupComplete: true },
    });

    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });

    let seriesCount = await prisma.receiptSeries.count({
      where: { active: true },
    });

    // Auto-provision an active receipt series if none exists
    if (seriesCount === 0) {
      const anySeries = await prisma.receiptSeries.findFirst();
      if (anySeries) {
        await prisma.receiptSeries.update({
          where: { id: anySeries.id },
          data: { active: true },
        });
        seriesCount = 1;
      } else {
        await prisma.receiptSeries.create({
          data: {
            name: "DEFAULT",
            nextNumber: 1,
            active: true,
          },
        });
        seriesCount = 1;
      }
    }

    const initialized = !!settings;
    const hasAdmin = adminCount > 0;
    const hasReceiptSeries = seriesCount > 0;
    const setupComplete = settings?.setupComplete === true && hasAdmin && hasReceiptSeries;

    return { connected: true, initialized, hasAdmin, hasReceiptSeries, setupComplete };
  } catch (err: any) {
    const message = err?.message ?? "Database not initialized";
    return {
      connected: false,
      initialized: false,
      hasAdmin: false,
      hasReceiptSeries: false,
      setupComplete: false,
      error: message,
    };
  }
}

export async function GET(): Promise<NextResponse<SetupStatus>> {
  const missingEnv: string[] = [];
  const hasDb =
    !!process.env.DATABASE_URL ||
    !!(process.env as any).DB ||
    !!(process.env.SQL_HOST && process.env.SQL_USER);
  if (!hasDb) missingEnv.push("DATABASE_URL");

  const hasSecret =
    !!process.env.BETTER_AUTH_SECRET ||
    !!process.env.AUTH_SECRET ||
    !!process.env.NEXTAUTH_SECRET;
  if (!hasSecret) missingEnv.push("AUTH_SECRET");

  const envOk = missingEnv.length === 0;
  if (!envOk) {
    return NextResponse.json({
      envOk: false,
      dbConnected: false,
      dbInitialized: false,
      hasAdmin: false,
      hasReceiptSeries: false,
      setupComplete: false,
      missingEnv,
    });
  }

  const probe = await probeDb();

  const response = NextResponse.json({
    envOk: true,
    dbConnected: probe.connected,
    dbInitialized: probe.initialized,
    hasAdmin: probe.hasAdmin,
    hasReceiptSeries: probe.hasReceiptSeries,
    setupComplete: probe.setupComplete,
    missingEnv: [],
    ...(probe.error ? { dbError: probe.error } : {}),
  });

  if (probe.setupComplete) {
    response.cookies.set("izah-setup-complete", "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 31536000,
      path: "/",
    });
  }

  return response;
}
