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

export type ItemMetricPoint = {
  key: "CB_1TR" | "CB_2TR" | "CAM_01" | "CAM_02" | "CR_1TR";
  label: string;
  request: number;
  confirmed: number;
  gap: number;
  plan: number;
};

export type AnalysisDashboardData = {
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
  const dayNight =
    dayNightCandidate && options.dayNights.includes(dayNightCandidate)
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
  const weeklyRangeStart = new Date(anchorDate);
  weeklyRangeStart.setUTCDate(weeklyRangeStart.getUTCDate() - 6);

  const [rangeHeaders, filteredHeaders, planning, weeklyHeaders, weeklyPlanningRows] = await Promise.all([
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: { gte: rangeStart, lte: anchorDate },
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
      select: {
        tanggalOrder: true,
        details: {
          select: {
            qtyOrder: true,
            qtyConfirm: true,
          },
        },
      },
      orderBy: [{ tanggalOrder: "asc" }, { waktuOrder: "asc" }],
    }),
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: anchorDate,
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
      select: {
        details: {
          select: {
            itemCode: true,
            qtyOrder: true,
            qtyConfirm: true,
          },
        },
      },
      orderBy: [{ waktuOrder: "asc" }, { kodeOrder: "asc" }],
    }),
    prisma.dailyPlanning.findFirst({
      where: {
        tanggal: anchorDate,
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
    }),
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: { gte: weeklyRangeStart, lte: anchorDate },
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
      select: {
        tanggalOrder: true,
        details: {
          select: {
            qtyOrder: true,
            qtyConfirm: true,
          },
        },
      },
      orderBy: [{ tanggalOrder: "asc" }, { waktuOrder: "asc" }],
    }),
    prisma.dailyPlanning.findMany({
      where: {
        tanggal: { gte: weeklyRangeStart, lte: anchorDate },
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
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

  const itemTotals = createEmptyItemTotals();

  for (const header of filteredHeaders) {
    for (const detail of header.details) {
      const item = itemTotals[detail.itemCode as ItemKey];
      if (!item) {
        continue;
      }

      item.request += detail.qtyOrder ?? 0;
      item.confirmed += detail.qtyConfirm ?? 0;
    }
  }

  const planByItem: Record<ItemKey, number> = {
    CB_1TR: planning?.planProdCb1tr ?? 0,
    CB_2TR: planning?.planProdCb2tr ?? 0,
    CAM_01: planning?.planProdCam01 ?? 0,
    CAM_02: planning?.planProdCam02 ?? 0,
    CR_1TR: planning?.planProdCr1tr ?? 0,
  };

  const itemMetrics: ItemMetricPoint[] = ITEM_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    request: itemTotals[definition.key].request,
    confirmed: itemTotals[definition.key].confirmed,
    gap: itemTotals[definition.key].request - itemTotals[definition.key].confirmed,
    plan: planByItem[definition.key],
  }));

  const weeklyTotalsByDate = new Map<
    string,
    { planTotal: number; requestTotal: number; confirmedTotal: number }
  >();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(weeklyRangeStart);
    date.setUTCDate(weeklyRangeStart.getUTCDate() + index);
    weeklyTotalsByDate.set(formatDateInput(date), {
      planTotal: 0,
      requestTotal: 0,
      confirmedTotal: 0,
    });
  }

  for (const row of weeklyPlanningRows) {
    const key = formatDateInput(row.tanggal);
    const current = weeklyTotalsByDate.get(key);
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

  for (const header of weeklyHeaders) {
    const key = formatDateInput(header.tanggalOrder);
    const current = weeklyTotalsByDate.get(key);
    if (!current) {
      continue;
    }

    for (const detail of header.details) {
      current.requestTotal += detail.qtyOrder ?? 0;
      current.confirmedTotal += detail.qtyConfirm ?? 0;
    }
  }

  return {
    volumeOrderHarian: Array.from(volumeByDate.entries()).map(([date, value]) => ({
      date,
      label: formatShortDateLabel(date),
      requestTotal: value.requestTotal,
      deliveryTotal: value.deliveryTotal,
    })),
    requestVsConfirmedPerItem: itemMetrics,
    planRequestConfirmedWeekly: Array.from(weeklyTotalsByDate.entries()).map(([date, value]) => ({
      date,
      label: formatShortDateLabel(date),
      planTotal: value.planTotal,
      requestTotal: value.requestTotal,
      confirmedTotal: value.confirmedTotal,
    })),
  };
}

function createEmptyItemTotals() {
  return {
    CB_1TR: { request: 0, confirmed: 0 },
    CB_2TR: { request: 0, confirmed: 0 },
    CAM_01: { request: 0, confirmed: 0 },
    CAM_02: { request: 0, confirmed: 0 },
    CR_1TR: { request: 0, confirmed: 0 },
  };
}

function nullableFilterValue(value: string) {
  return value ? value : null;
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

function sortSimple(values: string[]) {
  return values.sort((a, b) => a.localeCompare(b));
}
