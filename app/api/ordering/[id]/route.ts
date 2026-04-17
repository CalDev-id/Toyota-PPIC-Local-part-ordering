import { authOptions } from "@/auth";
import {
  normalizePalletOrderPayload,
  validatePalletOrderInput,
} from "@/lib/pallet-order";
import {
  buildGapRemark,
  normalizeGapOrderPayload,
  validateGapOrderInput,
} from "@/lib/gap-order";
import {
  normalizeJunbikiOrderPayload,
  validateJunbikiOrderInput,
  type JunbikiOrderSection,
  type JunbikiOrderShellStatus,
} from "@/lib/junbiki-order";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EditableOrderResponse =
  | {
      orderId: string;
      truckType: "GAP";
      kodeOrder: string;
      tanggalOrder: string;
      shift: string;
      dayNight: string;
      ritaseRequest: number;
      remarksOrdering: string;
      items: Array<{
        itemCode: string;
        gapRequestQty: number;
      }>;
    }
  | {
      orderId: string;
      truckType: "PALLET";
      kodeOrder: string;
      tanggalOrder: string;
      shift: string;
      dayNight: string;
      ritaseRequest: number;
      remarksOrdering: string;
      items: Array<{
        itemCode: string;
        qtyOrder: number;
      }>;
    }
  | {
      orderId: string;
      truckType: "JUNBIKI";
      kodeOrder: string;
      tanggalOrder: string;
      shift: string;
      dayNight: string;
      ritaseRequest: number;
      ratioCb1tr: number;
      ratioCb2tr: number;
      remarksOrdering: string;
      selectedShells: Array<{
        code: string;
        section: JunbikiOrderSection;
        status: JunbikiOrderShellStatus;
        groupNumber: number;
      }>;
    };

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const order = await prisma.orderHeader.findUnique({
      where: { orderId: id },
      include: {
        details: {
          orderBy: [{ lineNo: "asc" }, { detailId: "asc" }],
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (normalizeStatus(order.statusOrder) !== "submitted") {
      return NextResponse.json({ error: "Hanya order Submitted yang bisa diedit" }, { status: 409 });
    }

    return NextResponse.json(buildEditableOrderResponse(order));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil detail order" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const order = await prisma.orderHeader.findUnique({
      where: { orderId: id },
      include: {
        details: {
          orderBy: [{ lineNo: "asc" }, { detailId: "asc" }],
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (normalizeStatus(order.statusOrder) !== "submitted") {
      return NextResponse.json({ error: "Hanya order Submitted yang bisa diedit" }, { status: 409 });
    }

    const payload = await req.json();
    const userLabel = session.user.name?.trim() || session.user.email || "SYSTEM";
    const now = new Date();

    if (order.truckType === "PALLET") {
      const input = normalizePalletOrderPayload(payload);
      const validationMessage = validatePalletOrderInput(input);

      if (validationMessage) {
        return NextResponse.json({ error: validationMessage }, { status: 400 });
      }

      const itemsByCode = new Map<string, number>(input.items.map((item) => [item.itemCode, item.qtyOrder]));

      await prisma.$transaction([
        prisma.orderHeader.update({
          where: { orderId: id },
          data: {
            shift: input.shift,
            dayNight: input.dayNight,
            ritaseRequest: input.ritaseRequest,
            remarksOrdering: input.remarksOrdering || null,
            updatedBy: userLabel,
            updatedAt: now,
          },
        }),
        ...order.details.map((detail) =>
          prisma.orderDetail.update({
            where: { detailId: detail.detailId },
            data: {
              qtyOrder: itemsByCode.get(detail.itemCode) ?? 0,
              updatedAt: now,
            },
          })
        ),
      ]);
    } else if (order.truckType === "JUNBIKI") {
      const input = normalizeJunbikiOrderPayload(payload);
      const validationMessage = validateJunbikiOrderInput(input);

      if (validationMessage) {
        return NextResponse.json({ error: validationMessage }, { status: 400 });
      }

      const activeShells = input.selected_shells.filter((shell) => shell.status === "active");
      const cb1trShells = input.selected_shells.filter((shell) => shell.section === "CB_1TR" && shell.status !== "idle");
      const cb2trShells = input.selected_shells.filter((shell) => shell.section === "CB_2TR" && shell.status !== "idle");
      const qtyCb1tr = activeShells.filter((shell) => shell.section === "CB_1TR").length * 5;
      const qtyCb2tr = activeShells.filter((shell) => shell.section === "CB_2TR").length * 5;
      const detailByCode = new Map(order.details.map((detail) => [detail.itemCode, detail.detailId]));

      await prisma.$transaction([
        prisma.orderHeader.update({
          where: { orderId: id },
          data: {
            tanggalOrder: new Date(`${input.tanggal_order}T00:00:00.000Z`),
            shift: input.shift,
            dayNight: input.day_night,
            ritaseRequest: input.ritase,
            ratioCb1tr: input.ratio_cb_1tr,
            ratioCb2tr: input.ratio_cb_2tr,
            shellStateCb1tr: JSON.stringify(cb1trShells),
            shellStateCb2tr: JSON.stringify(cb2trShells),
            remarksOrdering: input.remark || null,
            updatedBy: userLabel,
            updatedAt: now,
          },
        }),
        prisma.orderDetail.update({
          where: { detailId: detailByCode.get("CB_1TR")! },
          data: {
            qtyOrder: qtyCb1tr,
            updatedAt: now,
          },
        }),
        prisma.orderDetail.update({
          where: { detailId: detailByCode.get("CB_2TR")! },
          data: {
            qtyOrder: qtyCb2tr,
            updatedAt: now,
          },
        }),
      ]);
    } else if (order.truckType === "GAP") {
      const input = normalizeGapOrderPayload(payload);
      const validationMessage = validateGapOrderInput(input);

      if (validationMessage) {
        return NextResponse.json({ error: validationMessage }, { status: 400 });
      }

      const itemsByCode = new Map<string, number>(input.items.map((item) => [item.itemCode, item.gapRequestQty]));

      await prisma.$transaction([
        prisma.orderHeader.update({
          where: { orderId: id },
          data: {
            tanggalOrder: new Date(`${input.tanggalOrder}T00:00:00.000Z`),
            shift: input.shift,
            dayNight: input.dayNight,
            ritaseRequest: input.ritaseRequest,
            remarksOrdering: input.remarksOrdering || buildGapRemark(input.items),
            updatedBy: userLabel,
            updatedAt: now,
          },
        }),
        ...order.details.map((detail) =>
          prisma.orderDetail.update({
            where: { detailId: detail.detailId },
            data: {
              qtyOrder: 0,
              gapRequestQty: itemsByCode.get(detail.itemCode) ?? 0,
              updatedAt: now,
            },
          })
        ),
      ]);
    } else {
      return NextResponse.json({ error: "Truck type order tidak didukung untuk edit" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengubah order" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const order = await prisma.orderHeader.findUnique({
      where: { orderId: id },
      select: { orderId: true, statusOrder: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (normalizeStatus(order.statusOrder) !== "submitted") {
      return NextResponse.json({ error: "Hanya order Submitted yang bisa dihapus" }, { status: 409 });
    }

    await prisma.orderHeader.delete({
      where: { orderId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus order" }, { status: 500 });
  }
}

function normalizeStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function buildEditableOrderResponse(order: {
  orderId: string;
  truckType: string | null;
  kodeOrder: string;
  tanggalOrder: Date;
  shift: string;
  dayNight: string | null;
  ritaseRequest: number | null;
  ratioCb1tr: number;
  ratioCb2tr: number;
  remarksOrdering: string | null;
  shellStateCb1tr: string | null;
    shellStateCb2tr: string | null;
    details: Array<{
      itemCode: string;
      qtyOrder: number;
      gapRequestQty: number;
    }>;
}): EditableOrderResponse {
  if (order.truckType === "JUNBIKI") {
    return {
      orderId: order.orderId,
      truckType: "JUNBIKI",
      kodeOrder: order.kodeOrder,
      tanggalOrder: order.tanggalOrder.toISOString().slice(0, 10),
      shift: order.shift,
      dayNight: order.dayNight ?? "",
      ritaseRequest: order.ritaseRequest ?? 0,
      ratioCb1tr: order.ratioCb1tr ?? 0,
      ratioCb2tr: order.ratioCb2tr ?? 0,
      remarksOrdering: order.remarksOrdering ?? "",
      selectedShells: [
        ...parseShellState(order.shellStateCb1tr, "CB_1TR"),
        ...parseShellState(order.shellStateCb2tr, "CB_2TR"),
      ],
    };
  }

  if (order.truckType === "GAP") {
    return {
      orderId: order.orderId,
      truckType: "GAP",
      kodeOrder: order.kodeOrder,
      tanggalOrder: order.tanggalOrder.toISOString().slice(0, 10),
      shift: order.shift,
      dayNight: order.dayNight ?? "",
      ritaseRequest: order.ritaseRequest ?? 0,
      remarksOrdering: order.remarksOrdering ?? "",
      items: order.details.map((detail) => ({
        itemCode: detail.itemCode,
        gapRequestQty: detail.gapRequestQty ?? 0,
      })),
    };
  }

  return {
    orderId: order.orderId,
    truckType: "PALLET",
    kodeOrder: order.kodeOrder,
    tanggalOrder: order.tanggalOrder.toISOString().slice(0, 10),
    shift: order.shift,
    dayNight: order.dayNight ?? "",
    ritaseRequest: order.ritaseRequest ?? 0,
    remarksOrdering: order.remarksOrdering ?? "",
    items: order.details.map((detail) => ({
      itemCode: detail.itemCode,
      qtyOrder: detail.qtyOrder,
    })),
  };
}

function parseShellState(
  value: string | null,
  section: JunbikiOrderSection
): Array<{
  code: string;
  section: JunbikiOrderSection;
  status: JunbikiOrderShellStatus;
  groupNumber: number;
}> {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const code = typeof item.code === "string" ? item.code.trim().toUpperCase() : "";
      const status =
        typeof item.status === "string" && ["active", "blocked"].includes(item.status.toLowerCase())
          ? (item.status.toLowerCase() as JunbikiOrderShellStatus)
          : null;
      const groupNumber = typeof item.groupNumber === "number" ? item.groupNumber : Number(item.groupNumber ?? 0);

      if (!code || !status || !Number.isFinite(groupNumber)) {
        return [];
      }

      return [{ code, section, status, groupNumber }];
    });
  } catch {
    return [];
  }
}
