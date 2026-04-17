import { prisma } from "@/lib/prisma";

export type JunbikiOrderShellStatus = "idle" | "active" | "blocked";
export type JunbikiOrderSection = "CB_1TR" | "CB_2TR";

export type JunbikiSelectedShellInput = {
  code: string;
  section: JunbikiOrderSection;
  status: JunbikiOrderShellStatus;
  groupNumber: number;
};

export type JunbikiOrderInput = {
  tanggal_order: string;
  shift: string;
  day_night: string;
  ritase: number;
  ratio_cb_1tr: number;
  ratio_cb_2tr: number;
  remark: string;
  cb_1tr_enabled: boolean;
  cb_2tr_enabled: boolean;
  selected_shells: JunbikiSelectedShellInput[];
};

export type JunbikiOrderCreateResult = {
  orderId: string;
  kodeOrder: string;
  detailCount: number;
};

export type JunbikiOrderNeedMetrics = Record<JunbikiOrderSection, number>;

type NormalizedJunbikiShell = JunbikiSelectedShellInput;

const VALID_SHELL_STATUSES: JunbikiOrderShellStatus[] = ["idle", "active", "blocked"];
const VALID_SECTIONS: JunbikiOrderSection[] = ["CB_1TR", "CB_2TR"];
const PCS_PER_SHELL = 5;
const MAX_TOTAL_QTY = 90;

const DETAIL_DEFINITIONS: Record<JunbikiOrderSection, { itemCode: string; itemName: string }> = {
  CB_1TR: {
    itemCode: "CB_1TR",
    itemName: "Cylinder Block 1TR",
  },
  CB_2TR: {
    itemCode: "CB_2TR",
    itemName: "Cylinder Block 2TR",
  },
};

export function normalizeJunbikiOrderPayload(body: unknown): JunbikiOrderInput {
  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const rawShells = Array.isArray(payload.selected_shells) ? payload.selected_shells : [];

  return {
    tanggal_order: normalizeDateInput(payload.tanggal_order),
    shift: normalizeText(payload.shift).toUpperCase(),
    day_night: normalizeText(payload.day_night).toUpperCase(),
    ritase: normalizeInteger(payload.ritase),
    ratio_cb_1tr: normalizeInteger(payload.ratio_cb_1tr),
    ratio_cb_2tr: normalizeInteger(payload.ratio_cb_2tr),
    remark: normalizeText(payload.remark),
    cb_1tr_enabled: normalizeBoolean(payload.cb_1tr_enabled, true),
    cb_2tr_enabled: normalizeBoolean(payload.cb_2tr_enabled, true),
    selected_shells: rawShells
      .map((value) => normalizeShell(value))
      .filter((shell): shell is JunbikiSelectedShellInput => shell !== null),
  };
}

export function validateJunbikiOrderInput(input: JunbikiOrderInput) {
  if (!input.tanggal_order) {
    return "Tanggal order wajib diisi";
  }

  if (!input.shift) {
    return "Shift wajib dipilih";
  }

  if (!input.day_night) {
    return "Day / Night wajib dipilih";
  }

  if (input.ritase <= 0) {
    return "Ritase wajib diisi lebih dari 0";
  }

  const ratioTotal = input.ratio_cb_1tr + input.ratio_cb_2tr;
  if (ratioTotal > MAX_TOTAL_QTY) {
    return `Total rasio produksi tidak boleh lebih dari ${MAX_TOTAL_QTY} pcs`;
  }

  const activeShellCount = input.selected_shells.filter((shell) => shell.status === "active").length;
  if (activeShellCount === 0) {
    return "Minimal satu shell aktif harus dipilih";
  }

  const activeQty = activeShellCount * PCS_PER_SHELL;
  if (activeQty > MAX_TOTAL_QTY) {
    return `Total shell aktif tidak boleh lebih dari ${MAX_TOTAL_QTY} pcs`;
  }

  return null;
}

export function buildJunbikiOrderData(input: JunbikiOrderInput, userLabel: string, now: Date) {
  const timestampKey = formatTimestampKey(now);
  const orderId = `ORDER-${timestampKey}`;
  const kodeOrder = `ORD-${timestampKey}`;

  const activeShells = input.selected_shells.filter((shell) => shell.status === "active");
  const cb1trShells = input.selected_shells.filter((shell) => shell.section === "CB_1TR" && shell.status !== "idle");
  const cb2trShells = input.selected_shells.filter((shell) => shell.section === "CB_2TR" && shell.status !== "idle");

  const qtyBySection: Record<JunbikiOrderSection, number> = {
    CB_1TR: activeShells.filter((shell) => shell.section === "CB_1TR").length * PCS_PER_SHELL,
    CB_2TR: activeShells.filter((shell) => shell.section === "CB_2TR").length * PCS_PER_SHELL,
  };

  return {
    header: {
      orderId,
      kodeOrder,
      tanggalOrder: new Date(`${input.tanggal_order}T00:00:00.000Z`),
      waktuOrder: now,
      shift: input.shift,
      dayNight: input.day_night,
      truckType: "JUNBIKI",
      ritaseRequest: input.ritase,
      ratioCb1tr: input.ratio_cb_1tr,
      ratioCb2tr: input.ratio_cb_2tr,
      shellStateCb1tr: JSON.stringify(cb1trShells),
      shellStateCb2tr: JSON.stringify(cb2trShells),
      statusOrder: "Submitted",
      remarksOrdering: input.remark || null,
      createdBy: userLabel,
      createdAt: now,
      updatedBy: userLabel,
      updatedAt: now,
    },
    details: (Object.keys(DETAIL_DEFINITIONS) as JunbikiOrderSection[]).map((section, index) => ({
      detailId: `DETAIL-${timestampKey}-${String(index + 1).padStart(2, "0")}`,
      orderId,
      itemCode: DETAIL_DEFINITIONS[section].itemCode,
      itemName: DETAIL_DEFINITIONS[section].itemName,
      qtyOrder: qtyBySection[section],
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

export async function getJunbikiOrderNeedMetrics(
  date: string,
  shift: string,
  dayNight: string,
  excludeOrderId?: string
): Promise<JunbikiOrderNeedMetrics> {
  const orderDate = new Date(`${date}T00:00:00.000Z`);
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
        itemCode: { in: ["CB_1TR", "CB_2TR"] },
        order: {
          orderId: excludeOrderId ? { not: excludeOrderId } : undefined,
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

  const totalOrderByItem = orderTotals.reduce<Partial<Record<JunbikiOrderSection, number>>>((acc, item) => {
    acc[item.itemCode as JunbikiOrderSection] = item._sum.qtyOrder ?? 0;
    return acc;
  }, {});

  const stockAwalByItem: JunbikiOrderNeedMetrics = {
    CB_1TR: (planning?.stockAwalJunbikiCb1tr ?? 0) + (planning?.stockAwalEmergencyCb1tr ?? 0),
    CB_2TR: (planning?.stockAwalJunbikiCb2tr ?? 0) + (planning?.stockAwalEmergencyCb2tr ?? 0),
  };

  const planByItem: JunbikiOrderNeedMetrics = {
    CB_1TR: planning?.planProdCb1tr ?? 0,
    CB_2TR: planning?.planProdCb2tr ?? 0,
  };

  return {
    CB_1TR: Math.max(planByItem.CB_1TR - stockAwalByItem.CB_1TR - (totalOrderByItem.CB_1TR ?? 0), 0),
    CB_2TR: Math.max(planByItem.CB_2TR - stockAwalByItem.CB_2TR - (totalOrderByItem.CB_2TR ?? 0), 0),
  };
}

export async function getJunbikiRecentOrders() {
  return prisma.orderHeader.findMany({
    where: {
      truckType: "JUNBIKI",
    },
    orderBy: { waktuOrder: "desc" },
    take: 20,
  });
}

function normalizeShell(value: unknown): NormalizedJunbikiShell | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const shell = value as Record<string, unknown>;
  const section = normalizeText(shell.section).toUpperCase() as JunbikiOrderSection;
  const status = normalizeText(shell.status).toLowerCase() as JunbikiOrderShellStatus;
  const code = normalizeText(shell.code).toUpperCase();
  const groupNumber = normalizeInteger(shell.groupNumber);

  if (!VALID_SECTIONS.includes(section)) {
    return null;
  }

  if (!VALID_SHELL_STATUSES.includes(status)) {
    return null;
  }

  if (!code) {
    return null;
  }

  return {
    code,
    section,
    status,
    groupNumber,
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

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeDateInput(value: unknown) {
  const raw = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function formatTimestampKey(value: Date) {
  return value.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}
