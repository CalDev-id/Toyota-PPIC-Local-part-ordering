import { prisma } from "@/lib/prisma";
import {
  getOrderingFilterOptions,
  normalizeOrderingFilter,
  type OrderMetricPair,
  type OrderingFilter,
  type OrderingFilterOptions,
} from "@/lib/order-report";

export type DeliveryMetricKey =
  | "cb1tr"
  | "cb2tr"
  | "camNo01"
  | "camNo02"
  | "cr1tr";

export type DeliverySummary = {
  key: DeliveryMetricKey;
  label: string;
  totalOrder: number;
  totalDelivery: number;
  gap: number;
};

export type DeliveryQueueRow = {
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
  items: DeliveryOrderItem[];
  cb1tr: OrderMetricPair;
  cb2tr: OrderMetricPair;
  camNo01: OrderMetricPair;
  camNo02: OrderMetricPair;
  cr1tr: OrderMetricPair;
  statusOrder: string;
  sortDateValue: number;
};

export type DeliveryOrderItem = {
  detailId: string;
  itemCode: string;
  itemName: string;
  qtyOrder: number;
  qtyConfirm: number;
  lineNo: number;
};

export type DeliveryPageData = {
  activeOrders: DeliveryQueueRow[];
  finishedOrders: DeliveryQueueRow[];
  summary: DeliverySummary[];
};

export { getOrderingFilterOptions, normalizeOrderingFilter };
export type { OrderingFilter, OrderingFilterOptions };

export async function getDeliveryPageData(filter: OrderingFilter): Promise<DeliveryPageData> {
  const headers = await prisma.orderHeader.findMany({
    where: {
      kodeOrder: { startsWith: "ORD-" },
      tanggalOrder: new Date(`${filter.date}T00:00:00.000Z`),
      shift: filter.shift,
      dayNight: filter.dayNight || null,
    },
    include: {
      details: {
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
        delivery: detail.qtyConfirm ?? 0,
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
        qtyConfirm: detail.qtyConfirm ?? 0,
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

  const activeOrders = rows.filter((row) => row.statusOrder.toLowerCase() === "submitted");
  const finishedOrders = rows.filter((row) => row.statusOrder.toLowerCase() === "confirmed");

  const summary = DELIVERY_SUMMARY_CONFIGS.map((config) => {
    const totals = headers.reduce(
      (acc, header) => {
        for (const detail of header.details) {
          if (detail.itemCode !== config.itemCode) {
            continue;
          }

          acc.totalOrder += detail.qtyOrder ?? 0;
          acc.totalDelivery += detail.qtyConfirm ?? 0;
        }

        return acc;
      },
      { totalOrder: 0, totalDelivery: 0 }
    );

    return {
      key: config.key,
      label: config.label,
      totalOrder: totals.totalOrder,
      totalDelivery: totals.totalDelivery,
      gap: totals.totalDelivery - totals.totalOrder,
    };
  });

  return { activeOrders, finishedOrders, summary };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "-";
}

function createEmptyMetrics(): Record<DeliveryMetricKey, OrderMetricPair> {
  return {
    cb1tr: { order: 0, delivery: 0 },
    cb2tr: { order: 0, delivery: 0 },
    camNo01: { order: 0, delivery: 0 },
    camNo02: { order: 0, delivery: 0 },
    cr1tr: { order: 0, delivery: 0 },
  };
}

function formatDateLabel(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES_SHORT[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const DELIVERY_SUMMARY_CONFIGS: Array<{
  key: DeliveryMetricKey;
  label: string;
  itemCode: string;
}> = [
  { key: "cb1tr", label: "CB_1TR", itemCode: "CB_1TR" },
  { key: "cb2tr", label: "CB_2TR", itemCode: "CB_2TR" },
  { key: "camNo01", label: "Cam_No_01", itemCode: "CAM_01" },
  { key: "camNo02", label: "Cam_No_02", itemCode: "CAM_02" },
  { key: "cr1tr", label: "CR_1TR", itemCode: "CR_1TR" },
];

const ITEM_CODE_TO_METRIC_KEY: Record<string, DeliveryMetricKey> = {
  CB_1TR: "cb1tr",
  CB_2TR: "cb2tr",
  CAM_01: "camNo01",
  CAM_02: "camNo02",
  CR_1TR: "cr1tr",
};
