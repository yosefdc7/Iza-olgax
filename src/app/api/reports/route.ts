import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  businessDateForInstant,
  businessDayUtcRange,
  isValidBusinessDate,
  isValidTimeZone,
  lastBusinessDateOfMonth,
  shiftBusinessDate,
} from "@/lib/daily-ledger";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const range = searchParams.get("range") ?? "today";

  const settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
    select: { businessTimezone: true },
  });
  const timeZone = isValidTimeZone(settings?.businessTimezone ?? "")
    ? (settings?.businessTimezone ?? "Asia/Manila")
    : "Asia/Manila";
  const today = businessDateForInstant(new Date(), timeZone);
  let fromDate = today;
  let toDate = today;

  switch (range) {
    case "week":
      fromDate = shiftBusinessDate(today, -6);
      break;
    case "month":
      fromDate = `${today.slice(0, 7)}-01`;
      toDate = lastBusinessDateOfMonth(today);
      break;
    case "custom": {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      fromDate = from || shiftBusinessDate(today, -30);
      toDate = to || today;
      break;
    }
    default: // today
      break;
  }

  if (!isValidBusinessDate(fromDate) || !isValidBusinessDate(toDate) || fromDate > toDate) {
    return NextResponse.json({ error: "Invalid report date range" }, { status: 400 });
  }

  const start = businessDayUtcRange(fromDate, timeZone).start;
  const end = new Date(businessDayUtcRange(toDate, timeZone).endExclusive.getTime() - 1);

  const [sales, topProducts, voidedCount, refundSummary, lowStockProducts] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: "COMPLETED" },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discountAmount: true,
        tipAmount: true,
        paymentMethod: true,
        paymentLines: true,
        createdAt: true,
        items: {
          select: {
            price: true,
            quantity: true,
            total: true,
            productId: true,
            unitCost: true,
          },
        },
        customer: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { createdAt: { gte: start, lte: end }, status: "COMPLETED" } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
    prisma.sale.count({ where: { createdAt: { gte: start, lte: end }, status: "VOIDED" } }),
    prisma.refund.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
        sku: true,
        category: true,
      },
      orderBy: { stock: "asc" },
      take: 100,
    }),
  ]);

  const lowStock = lowStockProducts
    .filter((p) => p.stock.lessThanOrEqualTo(p.lowStockThreshold))
    .map((p) => ({
      ...p,
      stock: parseFloat(p.stock.toString()),
      lowStockThreshold: parseFloat(p.lowStockThreshold.toString()),
    }));

  const byDay: Record<string, { revenue: number; transactions: number }> = {};
  let totalRevenue = 0;
  let totalTips = 0;
  let totalGrossProfit = 0;
  const paymentBreakdown: Record<string, number> = { CASH: 0, CARD: 0, OTHER: 0 };
  const uniqueCustomers = new Set<string>();

  for (const sale of sales) {
    const day = businessDateForInstant(sale.createdAt, timeZone);
    if (!byDay[day]) byDay[day] = { revenue: 0, transactions: 0 };
    const rev = parseFloat(sale.total.toString());
    byDay[day].revenue += rev;
    byDay[day].transactions += 1;
    totalRevenue += rev;
    totalTips += parseFloat((sale.tipAmount ?? 0).toString());
    if (sale.customer?.id) uniqueCustomers.add(sale.customer.id);

    for (const item of sale.items) {
      const itemRevenue = parseFloat(item.total.toString());
      const unitCost = item.unitCost ? parseFloat(item.unitCost.toString()) : 0;
      totalGrossProfit += itemRevenue - unitCost * parseFloat(item.quantity.toString());
    }

    const lines = sale.paymentLines as Array<{ method: string; amount: number }> | null;
    if (lines && lines.length > 0) {
      for (const line of lines) {
        paymentBreakdown[line.method] = (paymentBreakdown[line.method] ?? 0) + line.amount;
      }
    } else {
      paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] ?? 0) + rev;
    }
  }

  const revenueByDay = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  const pieData = Object.entries(paymentBreakdown)
    .filter(([, v]) => v > 0)
    .map(([method, value]) => ({ method, value: Math.round(value * 100) / 100 }));

  return NextResponse.json({
    summary: {
      revenue: totalRevenue,
      grossProfit: totalGrossProfit,
      transactions: sales.length,
      tips: totalTips,
      avgTransaction: sales.length > 0 ? totalRevenue / sales.length : 0,
      voidedCount,
      refundCount: refundSummary._count.id,
      refundTotal: parseFloat((refundSummary._sum.amount ?? 0).toString()),
      customerVisits: uniqueCustomers.size,
    },
    revenueByDay,
    pieData,
    topProducts: topProducts.map((p) => ({
      name: p.name,
      qty: parseFloat((p._sum.quantity ?? 0).toString()),
      revenue: parseFloat((p._sum.total ?? 0).toString()),
    })),
    lowStock,
  });
}
