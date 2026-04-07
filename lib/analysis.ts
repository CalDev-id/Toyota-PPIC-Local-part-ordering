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

export type DailyVolumePoint = {
  date: string;
  label: string;
  requestTotal: number;
  deliveryTotal: number;
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

  return {
    dates: Array.from(dates).sort((a, b) => b.localeCompare(a)),
    shifts: sortSimple(Array.from(shifts).filter(Boolean)),
    dayNights: sortSimple(Array.from(dayNights).filter(Boolean)),
  };
}

export async function normalizeAnalysisFilter(
  input: Partial<AnalysisFilter> | undefined
): Promise<AnalysisFilter> {
  const options = await getAnalysisFilterOptions();
  const latestFallback = await getLatestAnalysisFilterFallback();

  const date =
    input?.date && options.dates.includes(input.date)
      ? input.date
      : latestFallback.date || options.dates[0] || formatDateInput(new Date());

  const shiftCandidate = normalizeShift(input?.shift);
  const shift =
    shiftCandidate && options.shifts.includes(shiftCandidate)
      ? shiftCandidate
      : latestFallback.shift || options.shifts[0] || "";

  const dayNightCandidate = normalizeDayNight(input?.dayNight);
  const dayNight =
    dayNightCandidate && options.dayNights.includes(dayNightCandidate)
      ? dayNightCandidate
      : latestFallback.dayNight || options.dayNights[0] || "";

  return { date, shift, dayNight };
}

export async function getAnalysisDashboardData(filter: AnalysisFilter): Promise<AnalysisDashboardData> {
  const anchorDate = new Date(`${filter.date}T00:00:00.000Z`);
  const rangeStart = new Date(anchorDate);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 13);

  const [rangeHeaders, filteredHeaders, planning] = await Promise.all([
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: { gte: rangeStart, lte: anchorDate },
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
      include: { details: true },
      orderBy: [{ tanggalOrder: "asc" }, { waktuOrder: "asc" }],
    }),
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: anchorDate,
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
      include: { details: true },
      orderBy: [{ waktuOrder: "asc" }, { kodeOrder: "asc" }],
    }),
    prisma.dailyPlanning.findFirst({
      where: {
        tanggal: anchorDate,
        shift: filter.shift,
        dayNight: nullableFilterValue(filter.dayNight),
      },
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

  return {
    volumeOrderHarian: Array.from(volumeByDate.entries()).map(([date, value]) => ({
      date,
      label: formatShortDateLabel(date),
      requestTotal: value.requestTotal,
      deliveryTotal: value.deliveryTotal,
    })),
    requestVsConfirmedPerItem: itemMetrics,
  };
}

async function getLatestAnalysisFilterFallback(): Promise<AnalysisFilter> {
  const latestPlanning = await prisma.dailyPlanning.findFirst({
    orderBy: [{ tanggal: "desc" }, { shift: "asc" }, { dayNight: "asc" }],
  });

  if (latestPlanning) {
    return {
      date: formatDateInput(latestPlanning.tanggal),
      shift: normalizeShift(latestPlanning.shift),
      dayNight: normalizeDayNight(latestPlanning.dayNight),
    };
  }

  const latestOrder = await prisma.orderHeader.findFirst({
    where: { kodeOrder: { startsWith: "ORD-" } },
    orderBy: [{ tanggalOrder: "desc" }, { waktuOrder: "desc" }],
  });

  if (latestOrder) {
    return {
      date: formatDateInput(latestOrder.tanggalOrder),
      shift: normalizeShift(latestOrder.shift),
      dayNight: normalizeDayNight(latestOrder.dayNight),
    };
  }

  return {
    date: formatDateInput(new Date()),
    shift: "",
    dayNight: "",
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
