import { authOptions } from "@/auth";
import {
  buildJunbikiOrderData,
  getJunbikiOrderNeedMetrics,
  normalizeJunbikiOrderPayload,
  validateJunbikiOrderInput,
} from "@/lib/junbiki-order";
import { createRoleNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date")?.trim() || "";
    const shift = searchParams.get("shift")?.trim().toUpperCase() || "";
    const dayNight = searchParams.get("dayNight")?.trim().toUpperCase() || "";
    const excludeOrderId = searchParams.get("excludeOrderId")?.trim() || undefined;

    const orderNeeds = date && shift && dayNight
      ? await getJunbikiOrderNeedMetrics(date, shift, dayNight, excludeOrderId)
      : { CB_1TR: 0, CB_2TR: 0 };

    return NextResponse.json({ orderNeeds });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil order need Junbiki" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = normalizeJunbikiOrderPayload(await req.json());
    const validationMessage = validateJunbikiOrderInput(input);

    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const userLabel = session.user.name?.trim() || session.user.email || "SYSTEM";
    const now = new Date();
    const { header, details } = buildJunbikiOrderData(input, userLabel, now);

    await prisma.$transaction([
      prisma.orderHeader.create({ data: header }),
      prisma.orderDetail.createMany({ data: details }),
    ]);

    await createRoleNotification({
      type: "ORDER_CREATED",
      title: "Order baru",
      message: `Order baru ${header.kodeOrder}`,
      kodeOrder: header.kodeOrder,
      orderId: header.orderId,
      targetRole: "DELIVERY",
    });

    return NextResponse.json(
      {
        orderId: header.orderId,
        kodeOrder: header.kodeOrder,
        detailCount: details.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Order Junbiki gagal dibuat karena ID bentrok, coba lagi" }, { status: 409 });
    }

    return NextResponse.json({ error: "Gagal membuat order Junbiki" }, { status: 500 });
  }
}
