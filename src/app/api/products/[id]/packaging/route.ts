import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-auth";
import { db } from "@/lib/db";
import { packagingFormSchema } from "@/lib/validations/product";

// GET /api/products/[id]/packaging
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packagings = await db.productPackaging.findMany({
    where: { productId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(packagings);
}

// POST /api/products/[id]/packaging
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const packaging = await db.productPackaging.create({
      data: {
        productId: id,
        name,
        conversionQty,
        price,
        barcode: barcode || null,
      },
    });
    return NextResponse.json(packaging, { status: 201 });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      return NextResponse.json(
        { error: "A packaging with that barcode already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
