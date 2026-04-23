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

export type TrackingMetricKey =
  | "cb1tr"
  | "cb2tr"
  | "camNo01"
  | "camNo02"
  | "cr1tr";

export type TrackingOrderRow = {
  orderId: string;
  kodeOrder: string;
  tanggalOrder: string;
  waktuOrder: string;
  shift: string;
  dayNight: string;
  truckType: string;
  statusOrder: string;
  ritaseRequest: number;
  originLabel: string;
  destinationLabel: string;
  cb1tr: OrderMetricPair;
  cb2tr: OrderMetricPair;
  camNo01: OrderMetricPair;
  camNo02: OrderMetricPair;
  cr1tr: OrderMetricPair;
  totalOrder: number;
  totalConfirmed: number;
  totalReceived: number;
  sortDateValue: number;
};

export type TrackingSummary = {
  totalOrders: number;
  submittedOrders: number;
  confirmedOrders: number;
  checkedOrders: number;
};

export type TrackingPageData = {
  rows: TrackingOrderRow[];
  summary: TrackingSummary;
};

export { getOrderingFilterOptions, normalizeOrderingFilter, resolveOrderingContext };
export type { OrderingFilter, OrderingFilterOptions, ResolvedOrderingContext };

export async function getTrackingPageData(filter: OrderingFilter): Promise<TrackingPageData> {
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
      waktuOrder: true,
      shift: true,
      dayNight: true,
      truckType: true,
      ritaseRequest: true,
      statusOrder: true,
      details: {
        select: {
          itemCode: true,
          qtyOrder: true,
          gapRequestQty: true,
          qtyConfirm: true,
          qtyReceived: true,
        },
      },
    },
    orderBy: [{ waktuOrder: "desc" }, { kodeOrder: "desc" }],
  });

  const rows = headers.map((header) => {
    const metrics = createEmptyMetrics();
    let totalOrder = 0;
    let totalConfirmed = 0;
    let totalReceived = 0;

    for (const detail of header.details) {
      const metricKey = ITEM_CODE_TO_METRIC_KEY[detail.itemCode];
      const qtyOrder = detail.qtyOrder ?? 0;
      const qtyConfirm = detail.qtyConfirm ?? 0;
      const qtyReceived = detail.qtyReceived ?? 0;

      totalOrder += qtyOrder;
      totalConfirmed += qtyConfirm;
      totalReceived += qtyReceived;

      if (!metricKey) {
        continue;
      }

      metrics[metricKey] = {
        order: qtyOrder,
        gapRequest: detail.gapRequestQty ?? 0,
        delivery: qtyConfirm,
        received: qtyReceived,
      };
    }

    return {
      orderId: header.orderId,
      kodeOrder: normalizeText(header.kodeOrder),
      tanggalOrder: formatDateLabel(header.tanggalOrder),
      waktuOrder: formatTimeLabel(header.waktuOrder),
      shift: normalizeText(header.shift),
      dayNight: normalizeText(header.dayNight),
      truckType: normalizeText(header.truckType),
      statusOrder: normalizeText(header.statusOrder),
      ritaseRequest: header.ritaseRequest ?? 0,
      originLabel: "Sunter Plant 1",
      destinationLabel: "Sunter Plant 2",
      cb1tr: metrics.cb1tr,
      cb2tr: metrics.cb2tr,
      camNo01: metrics.camNo01,
      camNo02: metrics.camNo02,
      cr1tr: metrics.cr1tr,
      totalOrder,
      totalConfirmed,
      totalReceived,
      sortDateValue: header.waktuOrder.getTime(),
    };
  });

  return {
    rows,
    summary: {
      totalOrders: rows.length,
      submittedOrders: rows.filter((row) => row.statusOrder.toLowerCase() === "submitted").length,
      confirmedOrders: rows.filter((row) => row.statusOrder.toLowerCase() === "confirmed").length,
      checkedOrders: rows.filter((row) => row.statusOrder.toLowerCase() === "checked").length,
    },
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "-";
}

function createEmptyMetrics(): Record<TrackingMetricKey, OrderMetricPair> {
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

function formatTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const ITEM_CODE_TO_METRIC_KEY: Record<string, TrackingMetricKey> = {
  CB_1TR: "cb1tr",
  CB_2TR: "cb2tr",
  CAM_01: "camNo01",
  CAM_02: "camNo02",
  CR_1TR: "cr1tr",
};
