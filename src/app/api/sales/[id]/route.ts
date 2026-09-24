import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      receiptSeries: true,
      customer: true,
      user: { select: { id: true, name: true, role: true } },
      refunds: true,
    },
  });

  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const receiptSeriesName = sale.receiptSeries?.name || "DEFAULT";
  const receiptNumberFormatted = sale.receiptNumber
    ? `${receiptSeriesName}-${String(sale.receiptNumber).padStart(6, "0")}`
    : sale.legacyReference || sale.id;

  return NextResponse.json({
    sale: {
      ...sale,
      invoiceNumber: receiptNumberFormatted,
    },
  });
}
