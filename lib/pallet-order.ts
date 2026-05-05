import { prisma } from "@/lib/prisma";

export type PalletOrderItemCode = "CR_1TR" | "CAM_01" | "CAM_02" | "CB_1TR" | "CB_2TR";

export type PalletOrderItemInput = {
  itemCode: PalletOrderItemCode;
  qtyOrder: number;
};

export type PalletOrderInput = {
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: PalletOrderItemInput[];
};

export type PalletOrderCreateResult = {
  orderId: string;
  kodeOrder: string;
  detailCount: number;
};

export type PalletPlanMetrics = Record<PalletOrderItemCode, number>;

export const PALLET_ITEM_DEFINITIONS: Array<{
  code: PalletOrderItemCode;
  label: string;
  color?: "yellow" | "green";
}> = [
  { code: "CR_1TR", label: "Crankshaft 1TR" },
  { code: "CAM_01", label: "Camshaft No. 01", color: "yellow" },
  { code: "CAM_02", label: "Camshaft No. 02", color: "green" },
  { code: "CB_1TR", label: "Cylinder Block 1TR" },
  { code: "CB_2TR", label: "Cylinder Block 2TR" },
];

const ITEM_NAME_BY_CODE: Record<PalletOrderItemCode, string> = {
  CR_1TR: "Crankshaft 1TR",
  CAM_01: "Camshaft No. 01",
  CAM_02: "Camshaft No. 02",
  CB_1TR: "Cylinder Block 1TR",
  CB_2TR: "Cylinder Block 2TR",
};

export function normalizePalletOrderPayload(body: unknown): PalletOrderInput {
  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  return {
    tanggalOrder: normalizeText(payload.tanggalOrder),
    shift: normalizeText(payload.shift).toUpperCase(),
    dayNight: normalizeText(payload.dayNight).toUpperCase(),
    ritaseRequest: normalizeInteger(payload.ritaseRequest),
    remarksOrdering: normalizeText(payload.remarksOrdering),
    items: rawItems
      .map((item) => normalizeItem(item))
      .filter((item): item is PalletOrderItemInput => item !== null),
  };
}

export function validatePalletOrderInput(input: PalletOrderInput) {
  if (!input.tanggalOrder) {
    return "Tanggal order wajib dipilih";
  }

  if (!input.shift) {
    return "Shift wajib dipilih";
  }

  if (!input.dayNight) {
    return "Day / Night wajib dipilih";
  }

  if (input.ritaseRequest <= 0) {
    return "Ritase wajib diisi lebih dari 0";
  }

  if (!input.items.some((item) => item.qtyOrder > 0)) {
    return "Minimal satu item harus diisi qty order";
  }

  return null;
}

export async function getPalletPlanningMetrics(
  shift: string,
  dayNight: string,
  date = new Date()
): Promise<PalletPlanMetrics> {
  const orderDate = new Date(`${formatDateInput(date)}T00:00:00.000Z`);
  const [planning, orderTotals] = await Promise.all([
    prisma.dailyPlanning.findFirst({
      where: {
        tanggal: orderDate,
        shift,
        dayNight: dayNight || null,
      },
    }),
    prisma.orderDetail.groupBy({
      by: ["itemCode"],
      where: {
        itemCode: { in: PALLET_ITEM_DEFINITIONS.map((definition) => definition.code) },
        order: {
          kodeOrder: { startsWith: "ORD-" },
          tanggalOrder: orderDate,
          shift,
          dayNight: dayNight || null,
        },
      },
      _sum: {
        qtyOrder: true,
      },
    }),
  ]);

  const totalOrderByItem = orderTotals.reduce<Partial<Record<PalletOrderItemCode, number>>>((acc, item) => {
    acc[item.itemCode as PalletOrderItemCode] = item._sum.qtyOrder ?? 0;
    return acc;
  }, {});

  const stockAwalByItem: PalletPlanMetrics = {
    CB_1TR: (planning?.stockAwalJunbikiCb1tr ?? 0) + (planning?.stockAwalEmergencyCb1tr ?? 0),
    CB_2TR: (planning?.stockAwalJunbikiCb2tr ?? 0) + (planning?.stockAwalEmergencyCb2tr ?? 0),
    CR_1TR: planning?.stockAwalEmergencyCr1tr ?? 0,
    CAM_01: planning?.stockAwalEmergencyCam01 ?? 0,
    CAM_02: planning?.stockAwalEmergencyCam02 ?? 0,
  };

  const planByItem: PalletPlanMetrics = {
    CB_1TR: planning?.planProdCb1tr ?? 0,
    CB_2TR: planning?.planProdCb2tr ?? 0,
    CR_1TR: planning?.planProdCr1tr ?? 0,
    CAM_01: planning?.planProdCam01 ?? 0,
    CAM_02: planning?.planProdCam02 ?? 0,
  };

  return {
    CB_1TR: Math.max(planByItem.CB_1TR - stockAwalByItem.CB_1TR - (totalOrderByItem.CB_1TR ?? 0), 0),
    CB_2TR: Math.max(planByItem.CB_2TR - stockAwalByItem.CB_2TR - (totalOrderByItem.CB_2TR ?? 0), 0),
    CR_1TR: Math.max(planByItem.CR_1TR - stockAwalByItem.CR_1TR - (totalOrderByItem.CR_1TR ?? 0), 0),
    CAM_01: Math.max(planByItem.CAM_01 - stockAwalByItem.CAM_01 - (totalOrderByItem.CAM_01 ?? 0), 0),
    CAM_02: Math.max(planByItem.CAM_02 - stockAwalByItem.CAM_02 - (totalOrderByItem.CAM_02 ?? 0), 0),
  };
}

export function buildPalletOrderData(input: PalletOrderInput, userLabel: string, now: Date) {
  const timestampKey = formatTimestampKey(now);
  const orderId = `ORDER-${timestampKey}`;
  const kodeOrder = `ORD-${timestampKey}`;
  const activeItems = input.items.filter((item) => item.qtyOrder > 0);

  return {
    header: {
      orderId,
      kodeOrder,
      tanggalOrder: new Date(`${input.tanggalOrder}T00:00:00.000Z`),
      waktuOrder: now,
      shift: input.shift,
      dayNight: input.dayNight,
      truckType: "PALLET",
      ritaseRequest: input.ritaseRequest,
      statusOrder: "Submitted",
      remarksOrdering: input.remarksOrdering || null,
      createdBy: userLabel,
      createdAt: now,
      updatedBy: userLabel,
      updatedAt: now,
    },
    details: activeItems.map((item, index) => ({
      detailId: `DETAIL-${timestampKey}-${String(index + 1).padStart(2, "0")}`,
      orderId,
      itemCode: item.itemCode,
      itemName: ITEM_NAME_BY_CODE[item.itemCode],
      qtyOrder: item.qtyOrder,
      qtyConfirm: 0,
      qtyReceived: 0,
      remarksOrdering: null,
      remarksDelivery: null,
      lineNo: index + 1,
      createdAt: now,
      updatedAt: now,
    })),
  };
}

function normalizeItem(value: unknown): PalletOrderItemInput | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const itemCode = normalizeText(item.itemCode).toUpperCase() as PalletOrderItemCode;

  if (!PALLET_ITEM_DEFINITIONS.some((definition) => definition.code === itemCode)) {
    return null;
  }

  return {
    itemCode,
    qtyOrder: normalizeInteger(item.qtyOrder),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return 0;
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatTimestampKey(value: Date) {
  return value.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}
