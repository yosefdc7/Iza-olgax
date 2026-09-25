import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  // Only allow in non-production or when explicitly enabled
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_CLEANUP !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const prefix = body.prefix || "E2E-AUTO-";

    const testProducts = await prisma.product.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true },
    });
    const productIds = testProducts.map((p) => p.id);

    if (productIds.length > 0) {
      const saleItems = await prisma.saleItem.findMany({
        where: { productId: { in: productIds } },
        select: { saleId: true },
      });
      const saleIds = Array.from(new Set(saleItems.map((si) => si.saleId)));

      if (saleIds.length > 0) {
        await prisma.refund.deleteMany({ where: { saleId: { in: saleIds } } });
        await prisma.loyaltyLog.deleteMany({ where: { saleId: { in: saleIds } } });
        await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
        await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
      }

      await prisma.productPackaging.deleteMany({ where: { productId: { in: productIds } } });
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    }

    const heldOrders = await prisma.heldOrder.findMany();
    for (const held of heldOrders) {
      const snap = JSON.stringify(held.cartSnapshot);
      if (snap.includes(prefix)) {
        await prisma.heldOrder.delete({ where: { id: held.id } });
      }
    }

    return NextResponse.json({ success: true, deletedProducts: productIds.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
