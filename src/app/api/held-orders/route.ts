import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.heldOrder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  const order = await prisma.heldOrder.create({
    data: {
      label: body.label ?? null,
      cartSnapshot: body.cartSnapshot ?? {},
    },
  });
  return NextResponse.json(order, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let id: string | undefined;
  try {
    const text = await req.text();
    const data = text ? JSON.parse(text) : {};
    id = data.id;
  } catch {
    id = undefined;
  }

  if (id) {
    await prisma.heldOrder.delete({ where: { id } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
