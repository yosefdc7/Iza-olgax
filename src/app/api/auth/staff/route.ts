import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/pin-auth";

export async function GET() {
  try {
    // Auto-seed if database has no users
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          name: "Admin User",
          email: "admin@example.com",
          role: "ADMIN",
          pin: hashPin("1234"),
        },
      });
    }

    const settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      await prisma.businessSettings.create({
        data: {
          id: "singleton",
          name: "Izah POS Retail",
          setupComplete: true,
          currency: "₱",
          currencyDecimals: 2,
          taxRate: 8,
          taxName: "Tax",
          receiptFooter: "Thank you for shopping with us!",
        },
      });
    }

    const activeSeries = await prisma.receiptSeries.findFirst({ where: { active: true } });
    if (!activeSeries) {
      const anySeries = await prisma.receiptSeries.findFirst();
      if (anySeries) {
        await prisma.receiptSeries.update({
          where: { id: anySeries.id },
          data: { active: true },
        });
      } else {
        await prisma.receiptSeries.create({
          data: {
            name: "DEFAULT",
            nextNumber: 1,
            active: true,
          },
        });
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pin: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        hasPin: Boolean(u.pin),
      })),
    });
  } catch (err: any) {
    console.error("Failed to load staff list API:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load staff list", users: [] },
      { status: 500 }
    );
  }
}
