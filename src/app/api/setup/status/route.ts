import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface SetupStatus {
  envOk: boolean;
  dbConnected: boolean;
  dbInitialized: boolean;
  hasAdmin: boolean;
  setupComplete: boolean;
  missingEnv: string[];
  dbError?: string; // human-readable DB error surfaced to wizard UI
}

async function probeDb(): Promise<{
  connected: boolean;
  initialized: boolean;
  hasAdmin: boolean;
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

    const initialized = !!settings;
    const setupComplete = settings?.setupComplete === true;
    const hasAdmin = adminCount > 0;

    return { connected: true, initialized, hasAdmin, setupComplete };
  } catch (err: any) {
    const message = err?.message ?? "Database not initialized";
    return {
      connected: true,
      initialized: false,
      hasAdmin: false,
      setupComplete: false,
      error: message,
    };
  }
}

export async function GET(): Promise<NextResponse<SetupStatus>> {
  const missingEnv: string[] = [];
  const hasDb = !!process.env.DATABASE_URL || !!(process.env as any).DB;
  if (!hasDb) missingEnv.push("DATABASE_URL");
  if (!process.env.BETTER_AUTH_SECRET) missingEnv.push("BETTER_AUTH_SECRET");

  const envOk = missingEnv.length === 0;
  if (!envOk) {
    return NextResponse.json({
      envOk: false,
      dbConnected: false,
      dbInitialized: false,
      hasAdmin: false,
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
