import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(30),
  nextNumber: z.number().int().positive(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const series = await prisma.receiptSeries.findMany({
    where: session.user.role === "ADMIN" ? undefined : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ series });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const series = await prisma.receiptSeries.create({ data: parsed.data });
    return NextResponse.json({ series }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Receipt series name must be unique" }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = z.object({ id: z.string(), active: z.boolean() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const series = await prisma.receiptSeries.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active },
  });
  return NextResponse.json({ series });
}
