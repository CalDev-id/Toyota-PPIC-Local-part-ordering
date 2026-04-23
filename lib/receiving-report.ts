import { prisma } from "@/lib/prisma";
import {
  getOrderingFilterOptions,
  normalizeOrderingFilter,
  resolveOrderingContext,
  type OrderMetricPair,
  type OrderingFilter,
  type OrderingFilterOptions,
  type ResolvedOrderingContext,
} from "@/lib/order-report";

export type ReceivingMetricKey =
  | "cb1tr"
  | "cb2tr"
  | "camNo01"
  | "camNo02"
  | "cr1tr";

export type ReceivingSummary = {
  key: ReceivingMetricKey;
  label: string;
  totalOrder: number;
  totalConfirmed: number;
  totalReceived: number;
  gap: number;
};

export type ReceivingQueueRow = {
  orderId: string;
  kodeOrder: string;
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  truckType: string;
  ritaseRequest: number;
  deliveryNote: string;
  remarksOrdering: string;
  remarksDelivery: string;
  items: ReceivingOrderItem[];
  cb1tr: OrderMetricPair;
  cb2tr: OrderMetricPair;
  camNo01: OrderMetricPair;
  camNo02: OrderMetricPair;
  cr1tr: OrderMetricPair;
  statusOrder: string;
  sortDateValue: number;
};

export type ReceivingOrderItem = {
  detailId: string;
  itemCode: string;
  itemName: string;
  qtyOrder: number;
  gapRequestQty: number;
  qtyConfirm: number;
  qtyReceived: number;
  remarksDelivery: string;
  lineNo: number;
};

export type ReceivingPageData = {
  activeOrders: ReceivingQueueRow[];
  finishedOrders: ReceivingQueueRow[];
  summary: ReceivingSummary[];
};

export { getOrderingFilterOptions, normalizeOrderingFilter, resolveOrderingContext };
export type { OrderingFilter, OrderingFilterOptions, ResolvedOrderingContext };

export async function getReceivingPageData(filter: OrderingFilter): Promise<ReceivingPageData> {
  const headers = await prisma.orderHeader.findMany({
    where: {
      kodeOrder: { startsWith: "ORD-" },
      tanggalOrder: new Date(`${filter.date}T00:00:00.000Z`),
      shift: filter.shift,
      dayNight: filter.dayNight || null,
    },
    select: {
      orderId: true,
      kodeOrder: true,
      tanggalOrder: true,
      shift: true,
      dayNight: true,
      truckType: true,
      ritaseRequest: true,
      deliveryNote: true,
      remarksOrdering: true,
      remarksDelivery: true,
      statusOrder: true,
      waktuOrder: true,
      details: {
        select: {
          detailId: true,
          itemCode: true,
          itemName: true,
          qtyOrder: true,
          gapRequestQty: true,
          qtyConfirm: true,
          qtyReceived: true,
          remarksDelivery: true,
          lineNo: true,
        },
        orderBy: [{ lineNo: "asc" }, { detailId: "asc" }],
      },
    },
    orderBy: [{ waktuOrder: "desc" }, { kodeOrder: "desc" }],
  });

  const rows = headers.map((header) => {
    const metrics = createEmptyMetrics();

    for (const detail of header.details) {
      const metricKey = ITEM_CODE_TO_METRIC_KEY[detail.itemCode];

      if (!metricKey) {
        continue;
      }

      metrics[metricKey] = {
        order: detail.qtyOrder ?? 0,
        gapRequest: detail.gapRequestQty ?? 0,
        delivery: detail.qtyConfirm ?? 0,
        received: detail.qtyReceived ?? 0,
      };
    }

    return {
      orderId: header.orderId,
      kodeOrder: header.kodeOrder,
      tanggalOrder: formatDateLabel(header.tanggalOrder),
      shift: normalizeText(header.shift),
      dayNight: normalizeText(header.dayNight),
      truckType: normalizeText(header.truckType),
      ritaseRequest: header.ritaseRequest ?? 0,
      deliveryNote: normalizeText(header.deliveryNote),
      remarksOrdering: normalizeText(header.remarksOrdering),
      remarksDelivery: normalizeText(header.remarksDelivery),
      items: header.details.map((detail) => ({
        detailId: detail.detailId,
        itemCode: normalizeText(detail.itemCode),
        itemName: normalizeText(detail.itemName),
        qtyOrder: detail.qtyOrder ?? 0,
        gapRequestQty: detail.gapRequestQty ?? 0,
        qtyConfirm: detail.qtyConfirm ?? 0,
        qtyReceived: detail.qtyReceived ?? 0,
        remarksDelivery: detail.remarksDelivery?.trim() || "",
        lineNo: detail.lineNo ?? 0,
      })),
      cb1tr: metrics.cb1tr,
      cb2tr: metrics.cb2tr,
      camNo01: metrics.camNo01,
      camNo02: metrics.camNo02,
      cr1tr: metrics.cr1tr,
      statusOrder: normalizeText(header.statusOrder),
      sortDateValue: header.waktuOrder.getTime(),
    };
  });

  const activeOrders = rows.filter((row) => row.statusOrder.toLowerCase() === "confirmed");
  const finishedOrders = rows.filter((row) => row.statusOrder.toLowerCase() === "checked");

  const summary = RECEIVING_SUMMARY_CONFIGS.map((config) => {
    const totals = headers.reduce(
      (acc, header) => {
        for (const detail of header.details) {
          if (detail.itemCode !== config.itemCode) {
            continue;
          }

          acc.totalOrder += detail.qtyOrder ?? 0;
          acc.totalConfirmed += detail.qtyConfirm ?? 0;
          acc.totalReceived += detail.qtyReceived ?? 0;
        }

        return acc;
      },
      { totalOrder: 0, totalConfirmed: 0, totalReceived: 0 }
    );

    return {
      key: config.key,
      label: config.label,
      totalOrder: totals.totalOrder,
      totalConfirmed: totals.totalConfirmed,
      totalReceived: totals.totalReceived,
      gap: totals.totalReceived - totals.totalConfirmed,
    };
  });

  return { activeOrders, finishedOrders, summary };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "-";
}

function createEmptyMetrics(): Record<ReceivingMetricKey, OrderMetricPair> {
  return {
    cb1tr: { order: 0, delivery: 0, received: 0 },
    cb2tr: { order: 0, delivery: 0, received: 0 },
    camNo01: { order: 0, delivery: 0, received: 0 },
    camNo02: { order: 0, delivery: 0, received: 0 },
    cr1tr: { order: 0, delivery: 0, received: 0 },
  };
}

function formatDateLabel(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES_SHORT[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const RECEIVING_SUMMARY_CONFIGS: Array<{
  key: ReceivingMetricKey;
  label: string;
  itemCode: string;
}> = [
  { key: "cb1tr", label: "CB_1TR", itemCode: "CB_1TR" },
  { key: "cb2tr", label: "CB_2TR", itemCode: "CB_2TR" },
  { key: "camNo01", label: "Cam_No_01", itemCode: "CAM_01" },
  { key: "camNo02", label: "Cam_No_02", itemCode: "CAM_02" },
  { key: "cr1tr", label: "CR_1TR", itemCode: "CR_1TR" },
];

const ITEM_CODE_TO_METRIC_KEY: Record<string, ReceivingMetricKey> = {
  CB_1TR: "cb1tr",
  CB_2TR: "cb2tr",
  CAM_01: "camNo01",
  CAM_02: "camNo02",
  CR_1TR: "cr1tr",
};
