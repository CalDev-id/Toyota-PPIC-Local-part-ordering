import { getDefaultDayNightByTime } from "@/lib/day-night";
import { prisma } from "@/lib/prisma";

export type AnalysisFilter = {
  date: string;
  shift: string;
  dayNight: string;
};

export type AnalysisFilterOptions = {
  dates: string[];
  shifts: string[];
  dayNights: string[];
};

export type ResolvedAnalysisContext = {
  filter: AnalysisFilter;
  options: AnalysisFilterOptions;
};

const DEFAULT_SHIFT = "WHITE";
const ALL_FILTER_VALUE = "ALL";
const DAY_NIGHT_OPTIONS = ["DAY", "NIGHT"] as const;

export type DailyVolumePoint = {
  date: string;
  label: string;
  requestTotal: number;
  deliveryTotal: number;
};

export type WeeklyPlanRequestConfirmedPoint = {
  date: string;
  label: string;
  planTotal: number;
  requestTotal: number;
  confirmedTotal: number;
};

export type AnalysisKpiKey = "planAccuracy" | "orderAccuracy" | "receivingAccuracy";

export type AnalysisKpiSummary = {
  key: AnalysisKpiKey;
  label: string;
  value: number;
  delta: number;
};

export type WeeklyAccuracyPoint = {
  date: string;
  label: string;
  planAccuracy: number;
  orderAccuracy: number;
  receivingAccuracy: number;
};

export type WeeklyQuantityPoint = {
  date: string;
  label: string;
  planQty: number;
  orderQty: number;
  confirmedQty: number;
  receivedQty: number;
};

export type WeeklyItemQuantitySeries = {
  key: "CB_1TR" | "CB_2TR" | "CAM_01" | "CAM_02" | "CR_1TR";
  label: string;
  points: WeeklyQuantityPoint[];
};

export type ItemMetricPoint = {
  key: "CB_1TR" | "CB_2TR" | "CAM_01" | "CAM_02" | "CR_1TR";
  label: string;
  request: number;
  confirmed: number;
  received: number;
  gap: number;
  plan: number;
  planAccuracy: number;
  orderAccuracy: number;
  receivingAccuracy: number;
};

export type AnalysisDashboardData = {
  kpis: AnalysisKpiSummary[];
  weeklyAccuracy: WeeklyAccuracyPoint[];
  weeklyQuantity: WeeklyQuantityPoint[];
  rangeQuantity: WeeklyQuantityPoint[];
  weeklyItemQuantity: WeeklyItemQuantitySeries[];
  volumeOrderHarian: DailyVolumePoint[];
  requestVsConfirmedPerItem: ItemMetricPoint[];
  planRequestConfirmedWeekly: WeeklyPlanRequestConfirmedPoint[];
};

const ITEM_DEFINITIONS = [
  { key: "CB_1TR", label: "CB 1TR", planField: "planProdCb1tr" },
  { key: "CB_2TR", label: "CB 2TR", planField: "planProdCb2tr" },
  { key: "CAM_01", label: "Cam 01", planField: "planProdCam01" },
  { key: "CAM_02", label: "Cam 02", planField: "planProdCam02" },
  { key: "CR_1TR", label: "CR 1TR", planField: "planProdCr1tr" },
] as const;

type ItemKey = (typeof ITEM_DEFINITIONS)[number]["key"];

export async function getAnalysisFilterOptions(): Promise<AnalysisFilterOptions> {
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

  shifts.add(DEFAULT_SHIFT);
  shifts.add(ALL_FILTER_VALUE);
  dayNights.add(ALL_FILTER_VALUE);
  for (const dayNight of DAY_NIGHT_OPTIONS) {
    dayNights.add(dayNight);
  }

  return {
    dates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
    shifts: sortSimple(Array.from(shifts).filter(Boolean)),
    dayNights: sortSimple(Array.from(dayNights).filter(Boolean)),
  };
}

export async function normalizeAnalysisFilter(
  input: Partial<AnalysisFilter> | undefined
): Promise<AnalysisFilter> {
  const { filter } = await resolveAnalysisContext(input);
  return filter;
}

export async function resolveAnalysisContext(
  input: Partial<AnalysisFilter> | undefined
): Promise<ResolvedAnalysisContext> {
  const options = await getAnalysisFilterOptions();
  const today = formatDateInput(new Date());
  const defaultDayNight = getDefaultDayNightByTime();

  const date =
    isValidDateInput(input?.date) && options.dates.includes(input.date)
      ? input.date
      : options.dates[0] || today;

  const shiftCandidate = normalizeShift(input?.shift);
  const shift =
    shiftCandidate === ALL_FILTER_VALUE
      ? ALL_FILTER_VALUE
      : shiftCandidate && options.shifts.includes(shiftCandidate)
        ? shiftCandidate
        : options.shifts.includes(DEFAULT_SHIFT)
          ? DEFAULT_SHIFT
          : options.shifts[0] || DEFAULT_SHIFT;

  const dayNightCandidate = normalizeDayNight(input?.dayNight);
  const dayNight =
    dayNightCandidate === ALL_FILTER_VALUE
      ? ALL_FILTER_VALUE
      : dayNightCandidate && options.dayNights.includes(dayNightCandidate)
        ? dayNightCandidate
        : options.dayNights.includes(defaultDayNight)
          ? defaultDayNight
          : options.dayNights[0] || defaultDayNight;

  return {
    filter: { date, shift, dayNight },
    options,
  };
}

export async function getAnalysisDashboardData(filter: AnalysisFilter): Promise<AnalysisDashboardData> {
  const anchorDate = new Date(`${filter.date}T00:00:00.000Z`);
  const rangeStart = new Date(anchorDate);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 13);
  const shiftFilter = scalarFilterValue(filter.shift);
  const dayNightFilter = scalarFilterValue(filter.dayNight);

  const [rangeHeaders, weeklyPlanningRows] = await Promise.all([
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: { gte: rangeStart, lte: anchorDate },
        ...(shiftFilter === undefined ? {} : { shift: shiftFilter }),
        ...(dayNightFilter === undefined ? {} : { dayNight: dayNightFilter }),
      },
      select: {
        tanggalOrder: true,
        details: {
          select: {
            itemCode: true,
            qtyOrder: true,
            qtyConfirm: true,
            qtyReceived: true,
          },
        },
      },
      orderBy: [{ tanggalOrder: "asc" }, { waktuOrder: "asc" }],
    }),
    prisma.dailyPlanning.findMany({
      where: {
        tanggal: { gte: rangeStart, lte: anchorDate },
        ...(shiftFilter === undefined ? {} : { shift: shiftFilter }),
        ...(dayNightFilter === undefined ? {} : { dayNight: dayNightFilter }),
      },
      select: {
        tanggal: true,
        planProdCb1tr: true,
        planProdCb2tr: true,
        planProdCr1tr: true,
        planProdCam01: true,
        planProdCam02: true,
      },
      orderBy: [{ tanggal: "asc" }],
    }),
  ]);

  const volumeByDate = new Map<string, { requestTotal: number; deliveryTotal: number }>();

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(rangeStart);
    date.setUTCDate(rangeStart.getUTCDate() + index);
    volumeByDate.set(formatDateInput(date), { requestTotal: 0, deliveryTotal: 0 });
  }

  for (const header of rangeHeaders) {
    const key = formatDateInput(header.tanggalOrder);
    const current = volumeByDate.get(key);
    if (!current) {
      continue;
    }

    for (const detail of header.details) {
      current.requestTotal += detail.qtyOrder ?? 0;
      current.deliveryTotal += detail.qtyConfirm ?? 0;
    }
  }

  const rangeTotalsByDate = new Map<
    string,
    { planTotal: number; requestTotal: number; confirmedTotal: number; receivedTotal: number }
  >();

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(rangeStart);
    date.setUTCDate(rangeStart.getUTCDate() + index);
    rangeTotalsByDate.set(formatDateInput(date), {
      planTotal: 0,
      requestTotal: 0,
      confirmedTotal: 0,
      receivedTotal: 0,
    });
  }

  for (const row of weeklyPlanningRows) {
    const key = formatDateInput(row.tanggal);
    const current = rangeTotalsByDate.get(key);
    if (!current) {
      continue;
    }

    current.planTotal +=
      (row.planProdCb1tr ?? 0) +
      (row.planProdCb2tr ?? 0) +
      (row.planProdCr1tr ?? 0) +
      (row.planProdCam01 ?? 0) +
      (row.planProdCam02 ?? 0);
  }

  for (const header of rangeHeaders) {
    const key = formatDateInput(header.tanggalOrder);
    const current = rangeTotalsByDate.get(key);
    if (!current) {
      continue;
    }

    for (const detail of header.details) {
      current.requestTotal += detail.qtyOrder ?? 0;
      current.confirmedTotal += detail.qtyConfirm ?? 0;
      current.receivedTotal += detail.qtyReceived ?? 0;
    }
  }

  const rangeQuantity: WeeklyQuantityPoint[] = Array.from(rangeTotalsByDate.entries()).map(([date, value]) => ({
    date,
    label: formatShortDateLabel(date),
    planQty: value.planTotal,
    orderQty: value.requestTotal,
    confirmedQty: value.confirmedTotal,
    receivedQty: value.receivedTotal,
  }));
  const previousQuantity = rangeQuantity.slice(0, 7);
  const weeklyQuantity = rangeQuantity.slice(-7);
  const weeklyDateKeys = new Set(weeklyQuantity.map((point) => point.date));
  const weeklyItemQuantity = createWeeklyItemQuantity(weeklyQuantity);

  for (const row of weeklyPlanningRows) {
    const key = formatDateInput(row.tanggal);
    if (!weeklyDateKeys.has(key)) {
      continue;
    }

    addPlanToItemPoint(weeklyItemQuantity, "CB_1TR", key, row.planProdCb1tr ?? 0);
    addPlanToItemPoint(weeklyItemQuantity, "CB_2TR", key, row.planProdCb2tr ?? 0);
    addPlanToItemPoint(weeklyItemQuantity, "CR_1TR", key, row.planProdCr1tr ?? 0);
    addPlanToItemPoint(weeklyItemQuantity, "CAM_01", key, row.planProdCam01 ?? 0);
    addPlanToItemPoint(weeklyItemQuantity, "CAM_02", key, row.planProdCam02 ?? 0);
  }

  for (const header of rangeHeaders) {
    const key = formatDateInput(header.tanggalOrder);
    if (!weeklyDateKeys.has(key)) {
      continue;
    }

    for (const detail of header.details) {
      const point = findItemPoint(weeklyItemQuantity, detail.itemCode as ItemKey, key);
      if (!point) {
        continue;
      }

      point.orderQty += detail.qtyOrder ?? 0;
      point.confirmedQty += detail.qtyConfirm ?? 0;
      point.receivedQty += detail.qtyReceived ?? 0;
    }
  }

  const itemMetrics: ItemMetricPoint[] = ITEM_DEFINITIONS.map((definition) => {
    const totals = sumQuantityPoints(weeklyItemQuantity.find((item) => item.key === definition.key)?.points ?? []);

    return {
      key: definition.key,
      label: definition.label,
      request: totals.orderQty,
      confirmed: totals.confirmedQty,
      received: totals.receivedQty,
      gap: totals.orderQty - totals.confirmedQty,
      plan: totals.planQty,
      planAccuracy: calculateAccuracy(totals.orderQty, totals.planQty),
      orderAccuracy: calculateAccuracy(totals.confirmedQty, totals.orderQty),
      receivingAccuracy: calculateAccuracy(totals.receivedQty, totals.confirmedQty),
    };
  });

  const weeklyAccuracy: WeeklyAccuracyPoint[] = weeklyQuantity.map((point) => ({
    date: point.date,
    label: point.label,
    planAccuracy: calculateAccuracy(point.orderQty, point.planQty),
    orderAccuracy: calculateAccuracy(point.confirmedQty, point.orderQty),
    receivingAccuracy: calculateAccuracy(point.receivedQty, point.confirmedQty),
  }));

  const currentTotals = sumQuantityPoints(weeklyQuantity);
  const previousTotals = sumQuantityPoints(previousQuantity);
  const currentKpiAccuracy = {
    planAccuracy: calculateAccuracy(currentTotals.orderQty, currentTotals.planQty),
    orderAccuracy: calculateAccuracy(currentTotals.confirmedQty, currentTotals.orderQty),
    receivingAccuracy: calculateAccuracy(currentTotals.receivedQty, currentTotals.confirmedQty),
  };
  const previousKpiAccuracy = {
    planAccuracy: calculateAccuracy(previousTotals.orderQty, previousTotals.planQty),
    orderAccuracy: calculateAccuracy(previousTotals.confirmedQty, previousTotals.orderQty),
    receivingAccuracy: calculateAccuracy(previousTotals.receivedQty, previousTotals.confirmedQty),
  };

  const kpis: AnalysisKpiSummary[] = [
    {
      key: "planAccuracy",
      label: "Plan Accuracy",
      value: currentKpiAccuracy.planAccuracy,
      delta: currentKpiAccuracy.planAccuracy - previousKpiAccuracy.planAccuracy,
    },
    {
      key: "orderAccuracy",
      label: "Order Accuracy",
      value: currentKpiAccuracy.orderAccuracy,
      delta: currentKpiAccuracy.orderAccuracy - previousKpiAccuracy.orderAccuracy,
    },
    {
      key: "receivingAccuracy",
      label: "Receiving Accuracy",
      value: currentKpiAccuracy.receivingAccuracy,
      delta: currentKpiAccuracy.receivingAccuracy - previousKpiAccuracy.receivingAccuracy,
    },
  ];

  return {
    kpis,
    weeklyAccuracy,
    weeklyQuantity,
    rangeQuantity,
    weeklyItemQuantity,
    volumeOrderHarian: Array.from(volumeByDate.entries()).map(([date, value]) => ({
      date,
      label: formatShortDateLabel(date),
      requestTotal: value.requestTotal,
      deliveryTotal: value.deliveryTotal,
    })),
    requestVsConfirmedPerItem: itemMetrics,
    planRequestConfirmedWeekly: weeklyQuantity.map((value) => ({
      date: value.date,
      label: value.label,
      planTotal: value.planQty,
      requestTotal: value.orderQty,
      confirmedTotal: value.confirmedQty,
    })),
  };
}


function sumQuantityPoints(points: WeeklyQuantityPoint[]) {
  return points.reduce(
    (total, point) => ({
      planQty: total.planQty + point.planQty,
      orderQty: total.orderQty + point.orderQty,
      confirmedQty: total.confirmedQty + point.confirmedQty,
      receivedQty: total.receivedQty + point.receivedQty,
    }),
    { planQty: 0, orderQty: 0, confirmedQty: 0, receivedQty: 0 }
  );
}

export function createEmptyAnalysisDashboardData(): AnalysisDashboardData {
  return {
    kpis: [
      { key: "planAccuracy", label: "Plan Accuracy", value: 0, delta: 0 },
      { key: "orderAccuracy", label: "Order Accuracy", value: 0, delta: 0 },
      { key: "receivingAccuracy", label: "Receiving Accuracy", value: 0, delta: 0 },
    ],
    weeklyAccuracy: [],
    weeklyQuantity: [],
    rangeQuantity: [],
    weeklyItemQuantity: [],
    volumeOrderHarian: [],
    requestVsConfirmedPerItem: [],
    planRequestConfirmedWeekly: [],
  };
}

function createWeeklyItemQuantity(weeklyQuantity: WeeklyQuantityPoint[]): WeeklyItemQuantitySeries[] {
  return ITEM_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    points: weeklyQuantity.map((point) => ({
      date: point.date,
      label: point.label,
      planQty: 0,
      orderQty: 0,
      confirmedQty: 0,
      receivedQty: 0,
    })),
  }));
}

function addPlanToItemPoint(
  items: WeeklyItemQuantitySeries[],
  itemKey: ItemKey,
  date: string,
  value: number
) {
  const point = findItemPoint(items, itemKey, date);
  if (point) {
    point.planQty += value;
  }
}

function findItemPoint(items: WeeklyItemQuantitySeries[], itemKey: ItemKey, date: string) {
  return items.find((item) => item.key === itemKey)?.points.find((point) => point.date === date);
}

function scalarFilterValue(value: string) {
  if (!value || value === ALL_FILTER_VALUE) {
    return undefined;
  }

  return value;
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

function formatDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatShortDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function calculateAccuracy(numerator: number, denominator: number) {
  const largerValue = Math.max(numerator, denominator);
  if (largerValue <= 0) {
    return 0;
  }

  return (Math.min(numerator, denominator) / largerValue) * 100;
}

function sortSimple(values: string[]) {
  return values.sort((a, b) => {
    if (a === ALL_FILTER_VALUE) {
      return -1;
    }

    if (b === ALL_FILTER_VALUE) {
      return 1;
    }

    return a.localeCompare(b);
  });
}
