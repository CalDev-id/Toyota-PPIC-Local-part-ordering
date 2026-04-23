import { authOptions } from "@/auth";
import { buildGapOrderData, normalizeGapOrderPayload, validateGapOrderInput } from "@/lib/gap-order";
import { createRoleNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = normalizeGapOrderPayload(await req.json());
    const validationMessage = validateGapOrderInput(input);

    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const userLabel = session.user.name?.trim() || session.user.email || "SYSTEM";
    const now = new Date();
    const { header, details } = buildGapOrderData(input, userLabel, now);

    await prisma.$transaction([
      prisma.orderHeader.create({ data: header }),
      prisma.orderDetail.createMany({ data: details }),
    ]);

    await createRoleNotification({
      type: "ORDER_CREATED",
      title: "Request gap baru",
      message: `Request gap baru ${header.kodeOrder}`,
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
      return NextResponse.json({ error: "Request gap gagal dibuat karena ID bentrok, coba lagi" }, { status: 409 });
    }

    return NextResponse.json({ error: "Gagal membuat request gap" }, { status: 500 });
  }
}
