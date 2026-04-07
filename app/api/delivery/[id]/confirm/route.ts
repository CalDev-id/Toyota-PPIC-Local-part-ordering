import { authOptions } from "@/auth";
import { createRoleNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ConfirmDeliveryPayload = {
  deliveryNote?: unknown;
  remarksDelivery?: unknown;
  items?: unknown;
};

type ConfirmDeliveryItem = {
  itemCode: string;
  qtyConfirm: number;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERY" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = (await req.json()) as ConfirmDeliveryPayload;

    const deliveryNote = normalizeRequiredText(payload.deliveryNote, "Delivery Note wajib diisi");
    const remarksDelivery = normalizeRequiredText(payload.remarksDelivery, "Remarks delivery wajib diisi");
    const items = normalizeItems(payload.items);

    const order = await prisma.orderHeader.findUnique({
      where: { orderId: id },
      include: {
        details: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    const detailIdsByCode = new Map(order.details.map((detail) => [detail.itemCode, detail.detailId]));
    const invalidItem = items.find((item) => !detailIdsByCode.has(item.itemCode));

    if (invalidItem) {
      return NextResponse.json({ error: `Item ${invalidItem.itemCode} tidak ditemukan pada order ini` }, { status: 400 });
    }

    const userLabel = session.user.name?.trim() || session.user.email || "SYSTEM";
    const now = new Date();

    await prisma.$transaction([
      prisma.orderHeader.update({
        where: { orderId: id },
        data: {
          statusOrder: "Confirmed",
          deliveryNote,
          remarksDelivery,
          updatedBy: userLabel,
          updatedAt: now,
        },
      }),
      ...items.map((item) =>
        prisma.orderDetail.update({
          where: { detailId: detailIdsByCode.get(item.itemCode)! },
          data: {
            qtyConfirm: item.qtyConfirm,
            updatedAt: now,
          },
        })
      ),
    ]);

    await createRoleNotification({
      type: "DELIVERY_CONFIRMED",
      title: "Delivery dikonfirmasi",
      message: `Order ${order.kodeOrder} sudah dikonfirmasi Delivery`,
      kodeOrder: order.kodeOrder,
      orderId: order.orderId,
      targetRole: "ORDERING",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal mengonfirmasi delivery order" }, { status: 500 });
  }
}

function normalizeRequiredText(value: unknown, errorMessage: string) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new Error(errorMessage);
  }

  return text;
}

function normalizeItems(value: unknown): ConfirmDeliveryItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Item delivery wajib diisi");
  }

  return value.map((item, index) => {
    const itemCode = typeof item?.itemCode === "string" ? item.itemCode.trim().toUpperCase() : "";
    const qtyConfirm = Number(item?.qtyConfirm);

    if (!itemCode) {
      throw new Error(`Item code pada baris ${index + 1} wajib diisi`);
    }

    if (!Number.isFinite(qtyConfirm) || qtyConfirm < 0) {
      throw new Error(`Qty confirm pada ${itemCode} tidak valid`);
    }

    return {
      itemCode,
      qtyConfirm,
    };
  });
}
