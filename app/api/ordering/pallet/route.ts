import { authOptions } from "@/auth";
import {
  buildPalletOrderData,
  getPalletPlanningMetrics,
  normalizePalletOrderPayload,
  validatePalletOrderInput,
} from "@/lib/pallet-order";
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
    const planningDate = date ? new Date(`${date}T00:00:00.000Z`) : new Date();

    const plans = shift && dayNight ? await getPalletPlanningMetrics(shift, dayNight, planningDate) : {
      CB_1TR: 0,
      CB_2TR: 0,
      CR_1TR: 0,
      CAM_01: 0,
      CAM_02: 0,
    };

    return NextResponse.json({ plans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil plan produksi pallet" }, { status: 500 });
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

    const input = normalizePalletOrderPayload(await req.json());
    const validationMessage = validatePalletOrderInput(input);

    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const userLabel = session.user.name?.trim() || session.user.email || "SYSTEM";
    const now = new Date();
    const { header, details } = buildPalletOrderData(input, userLabel, now);

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
      return NextResponse.json({ error: "Order pallet gagal dibuat karena ID bentrok, coba lagi" }, { status: 409 });
    }

    return NextResponse.json({ error: "Gagal membuat order pallet" }, { status: 500 });
  }
}
