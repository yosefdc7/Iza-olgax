import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  filterLowStockProducts,
  calculateStockSummary,
  type StockAlertProduct,
} from "@/lib/stock-alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const rawLimit = Number(req.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 100;

    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
        unit: true,
        price: true,
        sku: true,
        barcode: true,
        category: true,
        imageUrl: true,
      },
      orderBy: { stock: "asc" },
    });

    const mappedProducts: StockAlertProduct[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: parseFloat(p.stock.toString()),
      lowStockThreshold: parseFloat(p.lowStockThreshold.toString()),
      unit: p.unit,
      price: parseFloat(p.price.toString()),
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      imageUrl: p.imageUrl,
    }));

    const lowStockItems = filterLowStockProducts(mappedProducts);
    const summary = calculateStockSummary(mappedProducts);

    return NextResponse.json({
      items: lowStockItems.slice(0, limit),
      summary,
      totalBelowThreshold: lowStockItems.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Low Stock API] Failed to fetch low stock products:", error);
    return NextResponse.json(
      {
        items: [],
        summary: {
          totalProducts: 0,
          totalBelowThreshold: 0,
          outOfStockCount: 0,
          lowStockCount: 0,
          hasCriticalStock: false,
        },
        totalBelowThreshold: 0,
        error: "Failed to fetch low stock alerts",
      },
      { status: 500 }
    );
  }
}
