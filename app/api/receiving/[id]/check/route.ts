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

type CheckReceivingPayload = {
  items?: unknown;
};

type CheckReceivingItem = {
  itemCode: string;
  qtyReceived: number;
  remarksDelivery: string | null;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "RECEIVING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = (await req.json()) as CheckReceivingPayload;
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
          statusOrder: "Checked",
          updatedBy: userLabel,
          updatedAt: now,
        },
      }),
      ...items.map((item) =>
        prisma.orderDetail.update({
          where: { detailId: detailIdsByCode.get(item.itemCode)! },
          data: {
            qtyReceived: item.qtyReceived,
            remarksDelivery: item.remarksDelivery,
            updatedAt: now,
          },
        })
      ),
    ]);

    await createRoleNotification({
      type: "RECEIVING_CHECKED",
      title: "Receiving selesai",
      message: `Order ${order.kodeOrder} sudah selesai di-check Receiving`,
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

    return NextResponse.json({ error: "Gagal menyimpan receiving order" }, { status: 500 });
  }
}

function normalizeItems(value: unknown): CheckReceivingItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Item receiving wajib diisi");
  }

  return value.map((item, index) => {
    const itemCode = typeof item?.itemCode === "string" ? item.itemCode.trim().toUpperCase() : "";
    const qtyReceived = Number(item?.qtyReceived);
    const remarksDelivery =
      typeof item?.remarksDelivery === "string" ? item.remarksDelivery.trim() : "";

    if (!itemCode) {
      throw new Error(`Item code pada baris ${index + 1} wajib diisi`);
    }

    if (!Number.isFinite(qtyReceived) || qtyReceived < 0) {
      throw new Error(`Qty received pada ${itemCode} tidak valid`);
    }

    return {
      itemCode,
      qtyReceived,
      remarksDelivery: remarksDelivery || null,
    };
  });
}
