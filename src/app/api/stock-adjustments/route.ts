import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { quantityFitsPrecision } from "@/lib/daily-ledger";

const adjustSchema = z.object({
  productId: z.string(),
  delta: z
    .number()
    .finite()
    .refine((value) => value !== 0, "Adjustment cannot be zero"),
  reason: z.enum(["RECEIVED", "DAMAGED", "THEFT", "CORRECTION", "OPENING_COUNT"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId, delta, reason, note } = parsed.data;

  try {
    const adjustment = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { quantityPrecision: true },
      });
      if (!product) throw new Error("Product not found");
      if (!quantityFitsPrecision(Math.abs(delta), product.quantityPrecision)) {
        throw new Error(`Adjustment must use at most ${product.quantityPrecision} decimal places`);
      }

      const created = await tx.stockAdjustment.create({
        data: { productId, userId: session.user.id, delta, reason, note },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
      });
      return created;
    });

    return NextResponse.json({ adjustment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stock adjustment failed";
    if (message === "Product not found")
      return NextResponse.json({ error: message }, { status: 404 });
    if (message.includes("decimal places"))
      return NextResponse.json({ error: message }, { status: 400 });
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productId = req.nextUrl.searchParams.get("productId");

  const adjustments = await prisma.stockAdjustment.findMany({
    where: productId ? { productId } : undefined,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ adjustments });
}
