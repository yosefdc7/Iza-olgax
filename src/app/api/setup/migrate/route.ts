import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export const maxDuration = 60; // 60s timeout

export async function POST(): Promise<NextResponse> {
  if ((process.env.NODE_ENV as string | undefined) === "production") {
    return NextResponse.json(
      { error: "Database migrations must be run before deployment." },
      { status: 410 }
    );
  }

  let dbUrl = process.env.DATABASE_URL;
  if (process.env.SQL_USER && process.env.SQL_HOST) {
    const user = encodeURIComponent(process.env.SQL_ADMIN_USER || process.env.SQL_USER);
    const pass = encodeURIComponent(process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "");
    const host = encodeURIComponent(process.env.SQL_HOST);
    const db = process.env.SQL_DB_NAME || "cloud_sql_development_database";
    dbUrl = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;
  }

  if (!dbUrl || dbUrl.includes("<password>")) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 400 });
  }

  // Guard: if already fully set up, refuse
  try {
    const { prisma } = await import("@/lib/db");
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
      select: { setupComplete: true },
    });
    if (settings?.setupComplete) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
    }
  } catch {
    // DB not init yet — proceed
  }

  const cwd = process.cwd();
  const prismaBin = path.join(cwd, "node_modules", ".bin", "prisma");

  try {
    const command = `"${prismaBin}" db push --accept-data-loss --url="${dbUrl}"`;

    const output = execSync(command, {
      cwd,
      timeout: 55_000,
      env: { ...process.env, DATABASE_URL: dbUrl },
      encoding: "utf-8",
    });

    return NextResponse.json({ ok: true, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Migration failed";
    const stderr =
      (err as { stderr?: Buffer | string; stdout?: Buffer | string })?.stderr?.toString() ??
      (err as { stderr?: Buffer | string; stdout?: Buffer | string })?.stdout?.toString() ??
      message;
    return NextResponse.json({ ok: false, error: stderr }, { status: 500 });
  }
}
