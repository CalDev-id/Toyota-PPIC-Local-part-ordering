export type GapOrderItemCode = "CR_1TR" | "CAM_01" | "CAM_02" | "CB_1TR" | "CB_2TR";

export type GapOrderItemInput = {
  itemCode: GapOrderItemCode;
  gapRequestQty: number;
};

export type GapOrderInput = {
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: GapOrderItemInput[];
};

export const GAP_ITEM_DEFINITIONS: Array<{ code: GapOrderItemCode; label: string }> = [
  { code: "CB_1TR", label: "Cylinder Block 1TR" },
  { code: "CB_2TR", label: "Cylinder Block 2TR" },
  { code: "CAM_01", label: "Camshaft No. 01" },
  { code: "CAM_02", label: "Camshaft No. 02" },
  { code: "CR_1TR", label: "Crankshaft 1TR" },
];

const ITEM_NAME_BY_CODE: Record<GapOrderItemCode, string> = {
  CR_1TR: "Crankshaft 1TR",
  CAM_01: "Camshaft No. 01",
  CAM_02: "Camshaft No. 02",
  CB_1TR: "Cylinder Block 1TR",
  CB_2TR: "Cylinder Block 2TR",
};

export function normalizeGapOrderPayload(body: unknown): GapOrderInput {
  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  return {
    tanggalOrder: normalizeDateInput(payload.tanggalOrder),
    shift: normalizeText(payload.shift).toUpperCase(),
    dayNight: normalizeText(payload.dayNight).toUpperCase(),
    ritaseRequest: normalizeInteger(payload.ritaseRequest),
    remarksOrdering: normalizeText(payload.remarksOrdering),
    items: rawItems
      .map((item) => normalizeItem(item))
      .filter((item): item is GapOrderItemInput => item !== null),
  };
}

export function validateGapOrderInput(input: GapOrderInput) {
  if (!input.tanggalOrder) {
    return "Tanggal order wajib diisi";
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

  if (!input.items.some((item) => item.gapRequestQty > 0)) {
    return "Minimal satu item gap harus diisi";
  }

  return null;
}

export function buildGapOrderData(input: GapOrderInput, userLabel: string, now: Date) {
  const timestampKey = formatTimestampKey(now);
  const orderId = `ORDER-${timestampKey}`;
  const kodeOrder = `ORD-${timestampKey}`;
  const activeItems = input.items.filter((item) => item.gapRequestQty > 0);
  const remarksOrdering = input.remarksOrdering || buildGapRemark(activeItems);

  return {
    header: {
      orderId,
      kodeOrder,
      tanggalOrder: new Date(`${input.tanggalOrder}T00:00:00.000Z`),
      waktuOrder: now,
      shift: input.shift,
      dayNight: input.dayNight,
      truckType: "GAP",
      requestType: "GAP",
      ritaseRequest: input.ritaseRequest,
      statusOrder: "Submitted",
      remarksOrdering,
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
      qtyOrder: 0,
      gapRequestQty: item.gapRequestQty,
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

export function buildGapRemark(items: GapOrderItemInput[]) {
  const summary = items
    .filter((item) => item.gapRequestQty > 0)
    .map((item) => `${item.itemCode} ${item.gapRequestQty}`)
    .join(", ");

  return summary ? `REQUEST GAP: ${summary}` : "REQUEST GAP";
}

function normalizeItem(value: unknown): GapOrderItemInput | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const itemCode = normalizeText(item.itemCode).toUpperCase() as GapOrderItemCode;

  if (!GAP_ITEM_DEFINITIONS.some((definition) => definition.code === itemCode)) {
    return null;
  }

  return {
    itemCode,
    gapRequestQty: normalizeInteger(item.gapRequestQty),
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
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return 0;
}

function normalizeDateInput(value: unknown) {
  const raw = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function formatTimestampKey(value: Date) {
  return value.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}
