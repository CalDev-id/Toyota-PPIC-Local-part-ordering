import { prisma } from "@/lib/prisma";

export type RecapFilter = {
  month: string;
  shift: string;
  dayNight: string;
};

export type RecapMetricKey = "cb1tr" | "cb2tr" | "cr1tr" | "cam01" | "cam02";

export type RecapItemMetric = {
  stockAwal: number;
  planProd: number;
  request: number;
  delivery: number;
  received: number;
  gap: number;
};

export type RecapRow = {
  key: string;
  tanggal: string;
  tanggalLabel: string;
  shift: string;
  dayNight: string;
  cb1tr: RecapItemMetric;
  cb2tr: RecapItemMetric;
  cr1tr: RecapItemMetric;
  cam01: RecapItemMetric;
  cam02: RecapItemMetric;
  totalPlan: number;
  totalRequest: number;
  totalDelivery: number;
  totalReceived: number;
};

export type RecapSummary = {
  totalRows: number;
  totalPlan: number;
  totalRequest: number;
  totalDelivery: number;
  totalReceived: number;
};

export type RecapPageData = {
  rows: RecapRow[];
  summary: RecapSummary;
};

type MetricConfig = {
  key: RecapMetricKey;
  label: string;
  itemCode: string;
};

export const RECAP_FILTER_ALL = "ALL";

export const RECAP_SHIFT_OPTIONS = [RECAP_FILTER_ALL, "RED", "WHITE"];
export const RECAP_DAY_NIGHT_OPTIONS = [RECAP_FILTER_ALL, "DAY", "NIGHT"];

export const RECAP_METRIC_CONFIGS: MetricConfig[] = [
  { key: "cb1tr", label: "CB 1TR", itemCode: "CB_1TR" },
  { key: "cb2tr", label: "CB 2TR", itemCode: "CB_2TR" },
  { key: "cr1tr", label: "CR 1TR", itemCode: "CR_1TR" },
  { key: "cam01", label: "Cam 01", itemCode: "CAM_01" },
  { key: "cam02", label: "Cam 02", itemCode: "CAM_02" },
];

export async function normalizeRecapFilter(input: Partial<RecapFilter> | undefined): Promise<RecapFilter> {
  return {
    month: isValidMonthInput(input?.month) ? input.month : formatMonthInput(new Date()),
    shift: normalizeOption(input?.shift, RECAP_SHIFT_OPTIONS),
    dayNight: normalizeOption(input?.dayNight, RECAP_DAY_NIGHT_OPTIONS),
  };
}

export async function getRecapPageData(filter: RecapFilter): Promise<RecapPageData> {
  const { startDate, endDate } = getMonthRange(filter.month);

  const [planningRows, orderRows] = await Promise.all([
    prisma.dailyPlanning.findMany({
      where: {
        tanggal: {
          gte: startDate,
          lt: endDate,
        },
        ...(filter.shift === RECAP_FILTER_ALL ? {} : { shift: filter.shift }),
        ...(filter.dayNight === RECAP_FILTER_ALL ? {} : { dayNight: filter.dayNight }),
      },
      orderBy: [{ tanggal: "desc" }, { shift: "asc" }, { dayNight: "asc" }],
    }),
    prisma.orderHeader.findMany({
      where: {
        kodeOrder: { startsWith: "ORD-" },
        tanggalOrder: {
          gte: startDate,
          lt: endDate,
        },
        ...(filter.shift === RECAP_FILTER_ALL ? {} : { shift: filter.shift }),
        ...(filter.dayNight === RECAP_FILTER_ALL ? {} : { dayNight: filter.dayNight }),
      },
      select: {
        tanggalOrder: true,
        shift: true,
        dayNight: true,
        details: {
          select: {
            itemCode: true,
            qtyOrder: true,
            qtyConfirm: true,
            qtyReceived: true,
          },
        },
      },
    }),
  ]);

  const rowsByKey = new Map<string, RecapRow>();

  for (const planning of planningRows) {
    const row = getOrCreateRow(rowsByKey, planning.tanggal, planning.shift, planning.dayNight);
    row.cb1tr.stockAwal += planning.stockAwalJunbikiCb1tr + planning.stockAwalEmergencyCb1tr;
    row.cb2tr.stockAwal += planning.stockAwalJunbikiCb2tr + planning.stockAwalEmergencyCb2tr;
    row.cr1tr.stockAwal += planning.stockAwalEmergencyCr1tr;
    row.cam01.stockAwal += planning.stockAwalEmergencyCam01;
    row.cam02.stockAwal += planning.stockAwalEmergencyCam02;
    row.cb1tr.planProd += planning.planProdCb1tr;
    row.cb2tr.planProd += planning.planProdCb2tr;
    row.cr1tr.planProd += planning.planProdCr1tr;
    row.cam01.planProd += planning.planProdCam01;
    row.cam02.planProd += planning.planProdCam02;
  }

  for (const order of orderRows) {
    const row = getOrCreateRow(rowsByKey, order.tanggalOrder, order.shift, order.dayNight);

    for (const detail of order.details) {
      const config = RECAP_METRIC_CONFIGS.find((item) => item.itemCode === detail.itemCode);
      if (!config) {
        continue;
      }

      row[config.key].request += detail.qtyOrder;
      row[config.key].delivery += detail.qtyConfirm ?? 0;
      row[config.key].received += detail.qtyReceived ?? 0;
    }
  }

  const rows = Array.from(rowsByKey.values())
    .map(finalizeRow)
    .sort((a, b) => {
      const dateCompare = b.tanggal.localeCompare(a.tanggal);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      const shiftCompare = a.shift.localeCompare(b.shift);
      if (shiftCompare !== 0) {
        return shiftCompare;
      }

      return a.dayNight.localeCompare(b.dayNight);
    });

  return {
    rows,
    summary: buildSummary(rows),
  };
}

function getOrCreateRow(rowsByKey: Map<string, RecapRow>, date: Date, shift: string, dayNight: string | null) {
  const tanggal = formatDateInput(date);
  const normalizedShift = normalizeText(shift) || "-";
  const normalizedDayNight = normalizeText(dayNight) || "-";
  const key = `${tanggal}|${normalizedShift}|${normalizedDayNight}`;
  const existingRow = rowsByKey.get(key);

  if (existingRow) {
    return existingRow;
  }

  const row: RecapRow = {
    key,
    tanggal,
    tanggalLabel: formatDateLabel(date),
    shift: normalizedShift,
    dayNight: normalizedDayNight,
    cb1tr: createEmptyMetric(),
    cb2tr: createEmptyMetric(),
    cr1tr: createEmptyMetric(),
    cam01: createEmptyMetric(),
    cam02: createEmptyMetric(),
    totalPlan: 0,
    totalRequest: 0,
    totalDelivery: 0,
    totalReceived: 0,
  };

  rowsByKey.set(key, row);
  return row;
}

function finalizeRow(row: RecapRow): RecapRow {
  for (const config of RECAP_METRIC_CONFIGS) {
    const metric = row[config.key];
    metric.gap = metric.delivery - metric.request;
  }

  return {
    ...row,
    totalPlan: RECAP_METRIC_CONFIGS.reduce((total, config) => total + row[config.key].planProd, 0),
    totalRequest: RECAP_METRIC_CONFIGS.reduce((total, config) => total + row[config.key].request, 0),
    totalDelivery: RECAP_METRIC_CONFIGS.reduce((total, config) => total + row[config.key].delivery, 0),
    totalReceived: RECAP_METRIC_CONFIGS.reduce((total, config) => total + row[config.key].received, 0),
  };
}

function buildSummary(rows: RecapRow[]): RecapSummary {
  return rows.reduce(
    (summary, row) => ({
      totalRows: summary.totalRows + 1,
      totalPlan: summary.totalPlan + row.totalPlan,
      totalRequest: summary.totalRequest + row.totalRequest,
      totalDelivery: summary.totalDelivery + row.totalDelivery,
      totalReceived: summary.totalReceived + row.totalReceived,
    }),
    {
      totalRows: 0,
      totalPlan: 0,
      totalRequest: 0,
      totalDelivery: 0,
      totalReceived: 0,
    }
  );
}

function createEmptyMetric(): RecapItemMetric {
  return {
    stockAwal: 0,
    planProd: 0,
    request: 0,
    delivery: 0,
    received: 0,
    gap: 0,
  };
}

function normalizeOption(value: string | undefined, options: string[]) {
  const normalized = value?.trim().toUpperCase() || RECAP_FILTER_ALL;
  return options.includes(normalized) ? normalized : RECAP_FILTER_ALL;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toUpperCase() || "";
}

function isValidMonthInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    startDate: new Date(Date.UTC(year, monthNumber - 1, 1)),
    endDate: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function formatMonthInput(value: Date) {
  return value.toISOString().slice(0, 7);
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateLabel(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES_SHORT[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  return `${day} ${month} ${year}`;
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
