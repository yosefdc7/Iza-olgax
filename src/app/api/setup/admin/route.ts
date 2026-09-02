import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPin } from "@/lib/pin-auth";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional().or(z.literal("")),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: only allow if setup not yet complete
  try {
    const { prisma } = await import("@/lib/db");
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
      select: { setupComplete: true },
    });
    if (settings?.setupComplete) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
    }
    // Also ensure no admin exists
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount > 0) {
      return NextResponse.json({ error: "An admin account already exists" }, { status: 409 });
    }
  } catch {
    // Table doesn't exist yet or DB not reachable — proceed; Prisma errors are
    // expected before migration runs. The actual create call below will surface
    // any real DB problem.
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, email, password, pin } = parsed.data;

  try {
    const { auth } = await import("@/lib/auth");

    // Use Better Auth's signUpEmail to handle password hashing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth internal server API is dynamically typed based on plugins
    const result = await (auth.api as any).signUpEmail({
      body: { name, email, password },
    });

    if (!result) {
      throw new Error("Sign-up returned no result");
    }

    // Update the created user to ADMIN role and set optional PIN
    const { prisma } = await import("@/lib/db");
    await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        pin: pin && pin.trim() !== "" ? hashPin(pin.trim()) : null,
      },
    });

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create admin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
