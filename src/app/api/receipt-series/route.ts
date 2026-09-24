import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(30),
  nextNumber: z.number().int().positive().default(1),
});

const patchSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  name: z.string().trim().min(1).max(30).optional(),
  nextNumber: z.number().int().positive().optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure default company receipt series (211 and CHB) exist and are available
  const defaultCompanies = ["211", "CHB"];
  for (const comp of defaultCompanies) {
    const existing = await prisma.receiptSeries.findUnique({ where: { name: comp } });
    if (!existing) {
      await prisma.receiptSeries.create({
        data: {
          name: comp,
          nextNumber: 1,
          active: true,
        },
      });
    }
  }

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
    return NextResponse.json({ error: `Receipt series "${parsed.data.name}" already exists` }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, ...data } = parsed.data;
  const series = await prisma.receiptSeries.update({
    where: { id },
    data,
  });
  return NextResponse.json({ series });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing receipt series ID" }, { status: 400 });

  const series = await prisma.receiptSeries.findUnique({
    where: { id },
    include: { _count: { select: { sales: true } } },
  });

  if (!series) {
    return NextResponse.json({ error: "Receipt series not found" }, { status: 404 });
  }

  if (series._count.sales > 0) {
    return NextResponse.json(
      { error: `Cannot delete "${series.name}" because it has ${series._count.sales} recorded sales. Deactivate it instead.` },
      { status: 400 }
    );
  }

  await prisma.receiptSeries.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: series.name });
}
