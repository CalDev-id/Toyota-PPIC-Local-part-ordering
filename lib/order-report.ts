import { getDefaultDayNightByTime } from "@/lib/day-night";
import { prisma } from "@/lib/prisma";

export type OrderMetricKey =
  | "cb1tr"
  | "cb2tr"
  | "camNo01"
  | "camNo02"
  | "cr1tr";

export type OrderMetricPair = {
  order: number;
  delivery: number;
  gapRequest?: number;
  received?: number;
};

export type OrderReportRow = {
  orderId: string;
  rawDate: string;
  date: string;
  time: string;
  code: string;
  shift: string;
  dayNight: string;
  truckType: string;
  ritaseRequest: number;
  statusOrder: string;
  cb1tr: OrderMetricPair;
  cb2tr: OrderMetricPair;
  camNo01: OrderMetricPair;
  camNo02: OrderMetricPair;
  cr1tr: OrderMetricPair;
  remarksJunbikiS2: string;
  remarksPalletS2: string;
  remarksGapS2: string;
  sortDateValue: number;
};

export type OrderItemSummary = {
  key: OrderMetricKey;
  label: string;
  totalStock: number;
  planProduksi: number;
  orderTotal: number;
  deliveryTotal: number;
  gap: number;
};

export type OrderingFilter = {
  date: string;
  shift: string;
  dayNight: string;
};

export type OrderingFilterOptions = {
  dates: string[];
  shifts: string[];
  dayNights: string[];
};

export type ResolvedOrderingContext = {
  filter: OrderingFilter;
  options: OrderingFilterOptions;
};

const DEFAULT_SHIFT = "WHITE";
const DAY_NIGHT_OPTIONS = ["DAY", "NIGHT"] as const;

type MetricConfig = {
  key: OrderMetricKey;
  label: string;
  itemCode: string;
  getPlanningStock: (metrics: DailyPlanningMetrics) => number;
  planningProdField: keyof DailyPlanningMetrics;
};

type DailyPlanningMetrics = {
  stockAwalJunbikiCb1tr: number;
  stockAwalJunbikiCb2tr: number;
  stockAwalEmergencyCb1tr: number;
  stockAwalEmergencyCb2tr: number;
  stockAwalEmergencyCr1tr: number;
  stockAwalEmergencyCam01: number;
  stockAwalEmergencyCam02: number;
  planProdCb1tr: number;
  planProdCb2tr: number;
  planProdCr1tr: number;
  planProdCam01: number;
  planProdCam02: number;
};

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: "cb1tr",
    label: "CB_1TR",
    itemCode: "CB_1TR",
    getPlanningStock: (metrics) => metrics.stockAwalJunbikiCb1tr + metrics.stockAwalEmergencyCb1tr,
    planningProdField: "planProdCb1tr",
  },
  {
    key: "cb2tr",
    label: "CB_2TR",
    itemCode: "CB_2TR",
    getPlanningStock: (metrics) => metrics.stockAwalJunbikiCb2tr + metrics.stockAwalEmergencyCb2tr,
    planningProdField: "planProdCb2tr",
  },
  {
    key: "camNo01",
    label: "Cam_No_01",
    itemCode: "CAM_01",
    getPlanningStock: (metrics) => metrics.stockAwalEmergencyCam01,
    planningProdField: "planProdCam01",
  },
  {
    key: "camNo02",
    label: "Cam_No_02",
    itemCode: "CAM_02",
    getPlanningStock: (metrics) => metrics.stockAwalEmergencyCam02,
    planningProdField: "planProdCam02",
  },
  {
    key: "cr1tr",
    label: "CR_1TR",
    itemCode: "CR_1TR",
    getPlanningStock: (metrics) => metrics.stockAwalEmergencyCr1tr,
    planningProdField: "planProdCr1tr",
  },
];

export async function getOrderingFilterOptions(): Promise<OrderingFilterOptions> {
  const [planningRows, orderRows] = await Promise.all([
    prisma.dailyPlanning.findMany({
      select: { tanggal: true, shift: true, dayNight: true },
      orderBy: [{ tanggal: "desc" }, { shift: "asc" }, { dayNight: "asc" }],
    }),
    prisma.orderHeader.findMany({
      where: { kodeOrder: { startsWith: "ORD-" } },
      select: { tanggalOrder: true, shift: true, dayNight: true },
      orderBy: [{ tanggalOrder: "desc" }, { shift: "asc" }, { dayNight: "asc" }],
    }),
  ]);

  const dates = new Set<string>();
  const shifts = new Set<string>();
  const dayNights = new Set<string>();

  for (const row of planningRows) {
    dates.add(formatDateInput(row.tanggal));
    shifts.add(normalizeShift(row.shift));
    dayNights.add(normalizeDayNight(row.dayNight));
  }

  for (const row of orderRows) {
    dates.add(formatDateInput(row.tanggalOrder));
    shifts.add(normalizeShift(row.shift));
    dayNights.add(normalizeDayNight(row.dayNight));
  }

  dates.add(formatDateInput(new Date()));
  shifts.add(DEFAULT_SHIFT);
  for (const dayNight of DAY_NIGHT_OPTIONS) {
    dayNights.add(dayNight);
  }

  return {
    dates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
    shifts: sortSimple(Array.from(shifts).filter(Boolean)),
    dayNights: sortSimple(Array.from(dayNights).filter(Boolean)),
  };
}

export async function normalizeOrderingFilter(
  input: Partial<OrderingFilter> | undefined
): Promise<OrderingFilter> {
  const { filter } = await resolveOrderingContext(input);
  return filter;
}

export async function resolveOrderingContext(
  input: Partial<OrderingFilter> | undefined
): Promise<ResolvedOrderingContext> {
  const options = await getOrderingFilterOptions();
  const today = formatDateInput(new Date());
  const defaultDayNight = getDefaultDayNightByTime();

  const date =
    isValidDateInput(input?.date)
      ? input.date
      : options.dates.includes(today)
        ? today
        : options.dates[0] || today;

  const shiftCandidate = normalizeShift(input?.shift);
  const shift =
    shiftCandidate && options.shifts.includes(shiftCandidate)
      ? shiftCandidate
      : options.shifts.includes(DEFAULT_SHIFT)
        ? DEFAULT_SHIFT
        : options.shifts[0] || DEFAULT_SHIFT;

  const dayNightCandidate = normalizeDayNight(input?.dayNight);
  const dayNight = options.dayNights.includes(dayNightCandidate)
    ? dayNightCandidate
    : options.dayNights.includes(defaultDayNight)
      ? defaultDayNight
      : options.dayNights[0] || defaultDayNight;

  return {
    filter: { date, shift, dayNight },
    options,
  };
}

export async function getOrderReportRows(filter: OrderingFilter): Promise<OrderReportRow[]> {
  const headers = await prisma.orderHeader.findMany({
    where: {
      kodeOrder: { startsWith: "ORD-" },
      tanggalOrder: new Date(`${filter.date}T00:00:00.000Z`),
      shift: filter.shift,
      dayNight: nullableFilterValue(filter.dayNight),
    },
    select: {
      orderId: true,
      tanggalOrder: true,
      waktuOrder: true,
      kodeOrder: true,
      shift: true,
      dayNight: true,
      truckType: true,
      ritaseRequest: true,
      statusOrder: true,
      remarksOrdering: true,
      details: {
        select: {
          itemCode: true,
          qtyOrder: true,
          gapRequestQty: true,
          qtyConfirm: true,
          lineNo: true,
        },
        orderBy: { lineNo: "asc" },
      },
    },
    orderBy: [{ waktuOrder: "desc" }, { kodeOrder: "desc" }],
  });

  return headers.map((header) => {
    const metrics = createEmptyMetricMap();

    for (const detail of header.details) {
      const metric = METRIC_CONFIGS.find((item) => item.itemCode === detail.itemCode);
      if (!metric) {
        continue;
      }

      metrics[metric.key] = {
        order: detail.qtyOrder,
        gapRequest: detail.gapRequestQty ?? 0,
        delivery: detail.qtyConfirm ?? 0,
      };
    }

    return {
      orderId: header.orderId,
      rawDate: formatDateInput(header.tanggalOrder),
      date: formatDateLabel(header.tanggalOrder),
      time: formatTimeLabel(header.waktuOrder),
      code: header.kodeOrder,
      shift: header.shift,
      dayNight: normalizeDayNight(header.dayNight),
      truckType: normalizeText(header.truckType),
      ritaseRequest: header.ritaseRequest ?? 0,
      statusOrder: normalizeText(header.statusOrder),
      cb1tr: metrics.cb1tr,
      cb2tr: metrics.cb2tr,
      camNo01: metrics.camNo01,
      camNo02: metrics.camNo02,
      cr1tr: metrics.cr1tr,
      remarksJunbikiS2: header.truckType === "JUNBIKI" ? normalizeText(header.remarksOrdering) : "-",
      remarksPalletS2: header.truckType === "PALLET" ? normalizeText(header.remarksOrdering) : "-",
      remarksGapS2: header.truckType === "GAP" ? normalizeText(header.remarksOrdering) : "-",
      sortDateValue: header.waktuOrder.getTime(),
    };
  });
}

export async function buildOrderItemSummaries(
  rows: OrderReportRow[],
  filter: OrderingFilter
): Promise<OrderItemSummary[]> {
  const planning = await prisma.dailyPlanning.findFirst({
    where: {
      tanggal: new Date(`${filter.date}T00:00:00.000Z`),
      shift: filter.shift,
      dayNight: nullableFilterValue(filter.dayNight),
    },
  });

  const planningMetrics: DailyPlanningMetrics = {
    stockAwalJunbikiCb1tr: planning?.stockAwalJunbikiCb1tr ?? 0,
    stockAwalJunbikiCb2tr: planning?.stockAwalJunbikiCb2tr ?? 0,
    stockAwalEmergencyCb1tr: planning?.stockAwalEmergencyCb1tr ?? 0,
    stockAwalEmergencyCb2tr: planning?.stockAwalEmergencyCb2tr ?? 0,
    stockAwalEmergencyCr1tr: planning?.stockAwalEmergencyCr1tr ?? 0,
    stockAwalEmergencyCam01: planning?.stockAwalEmergencyCam01 ?? 0,
    stockAwalEmergencyCam02: planning?.stockAwalEmergencyCam02 ?? 0,
    planProdCb1tr: planning?.planProdCb1tr ?? 0,
    planProdCb2tr: planning?.planProdCb2tr ?? 0,
    planProdCr1tr: planning?.planProdCr1tr ?? 0,
    planProdCam01: planning?.planProdCam01 ?? 0,
    planProdCam02: planning?.planProdCam02 ?? 0,
  };

  return METRIC_CONFIGS.map(({ key, label, getPlanningStock, planningProdField }) => {
    const stockAwal = getPlanningStock(planningMetrics);
    const totals = rows.reduce(
      (acc, row) => {
        acc.orderTotal += row[key].order;
        acc.deliveryTotal += row[key].delivery;
        return acc;
      },
      { orderTotal: 0, deliveryTotal: 0 }
    );

    return {
      key,
      label,
      totalStock: stockAwal + totals.deliveryTotal,
      planProduksi: planningMetrics[planningProdField],
      orderTotal: totals.orderTotal,
      deliveryTotal: totals.deliveryTotal,
      gap: totals.deliveryTotal - totals.orderTotal,
    };
  });
}

function createEmptyMetricMap(): Record<OrderMetricKey, OrderMetricPair> {
  return {
    cb1tr: { order: 0, delivery: 0 },
    cb2tr: { order: 0, delivery: 0 },
    camNo01: { order: 0, delivery: 0 },
    camNo02: { order: 0, delivery: 0 },
    cr1tr: { order: 0, delivery: 0 },
  };
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function normalizeShift(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || "";
}

function normalizeDayNight(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || "";
}

function isValidDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function nullableFilterValue(value: string) {
  return value ? value : null;
}

function formatDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

function formatDateLabel(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES_SHORT[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function sortSimple(values: string[]) {
  return values.sort((a, b) => a.localeCompare(b));
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
