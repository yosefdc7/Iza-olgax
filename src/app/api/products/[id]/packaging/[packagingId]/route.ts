import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-auth";
import { db } from "@/lib/db";
import { packagingFormSchema } from "@/lib/validations/product";

// PUT /api/products/[id]/packaging/[packagingId]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; packagingId: string }> }
) {
  const { packagingId } = await params;
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = packagingFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, conversionQty, price, barcode } = parsed.data;

  try {
    const updated = await db.productPackaging.update({
      where: { id: packagingId },
      data: { name, conversionQty, price, barcode: barcode || null },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      return NextResponse.json(
        { error: "A packaging with that barcode already exists" },
        { status: 409 }
      );
    }
    if (prismaErr.code === "P2025") {
      return NextResponse.json({ error: "Packaging not found" }, { status: 404 });
    }
    throw err;
  }
}

// DELETE /api/products/[id]/packaging/[packagingId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; packagingId: string }> }
) {
  const { packagingId } = await params;
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.productPackaging.delete({ where: { id: packagingId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2025") {
      return NextResponse.json({ error: "Packaging not found" }, { status: 404 });
    }
    throw err;
  }
}
