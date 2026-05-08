import {
  createEmptyAnalysisDashboardData,
  getAnalysisDashboardData,
  resolveAnalysisContext,
  type AnalysisDashboardData,
  type AnalysisFilter,
  type AnalysisFilterOptions,
  type ItemMetricPoint,
  type WeeklyAccuracyPoint,
  type WeeklyQuantityPoint,
} from "@/lib/analysis";
import { getDefaultDayNightByTime } from "@/lib/day-night";

export type HomeKpiKey = "plan" | "order" | "confirmed" | "received" | "pending";

export type HomeKpi = {
  key: HomeKpiKey;
  label: string;
  value: number;
  helper: string;
  tone: "sky" | "amber" | "emerald" | "slate" | "rose";
};

export type HomeAccuracy = {
  label: string;
  value: number;
  helper: string;
};

export type HomeDashboardData = {
  filter: AnalysisFilter;
  filterOptions: AnalysisFilterOptions;
  kpis: HomeKpi[];
  accuracy: HomeAccuracy[];
  requestVsConfirmedPerItem: ItemMetricPoint[];
  trend: WeeklyQuantityPoint[];
  accuracyTrend: WeeklyAccuracyPoint[];
  totals: {
    planQty: number;
    orderQty: number;
    confirmedQty: number;
    receivedQty: number;
    pendingConfirmQty: number;
    pendingReceiveQty: number;
  };
};

export async function getHomeDashboardData(
  input?: Partial<AnalysisFilter>
): Promise<HomeDashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const { filter, options } = await resolveAnalysisContext({
    ...input,
    date: input?.date ?? today,
  });
  const activeFilter = input?.date ? filter : { ...filter, date: today };
  const activeOptions = options.dates.includes(today)
    ? options
    : { ...options, dates: [today, ...options.dates] };
  const analysisData = await getAnalysisDashboardData(activeFilter);

  return mapAnalysisToHomeDashboard(activeFilter, activeOptions, analysisData);
}

export function createEmptyHomeDashboardData(): HomeDashboardData {
  const today = new Date().toISOString().slice(0, 10);
  const dayNight = getDefaultDayNightByTime();
  const filter = {
    date: today,
    shift: "WHITE",
    dayNight,
  };

  return mapAnalysisToHomeDashboard(
    filter,
    {
      dates: [today],
      shifts: [filter.shift],
      dayNights: [dayNight],
    },
    createEmptyAnalysisDashboardData()
  );
}

function mapAnalysisToHomeDashboard(
  filter: AnalysisFilter,
  filterOptions: AnalysisFilterOptions,
  analysisData: AnalysisDashboardData
): HomeDashboardData {
  const activePoint = analysisData.weeklyQuantity.find((point) => point.date === filter.date);
  const activeTotals = activePoint ?? {
    date: filter.date,
    label: formatShortDateLabel(filter.date),
    planQty: 0,
    orderQty: 0,
    confirmedQty: 0,
    receivedQty: 0,
  };
  const pendingConfirmQty = Math.max(activeTotals.orderQty - activeTotals.confirmedQty, 0);
  const pendingReceiveQty = Math.max(activeTotals.confirmedQty - activeTotals.receivedQty, 0);

  return {
    filter,
    filterOptions,
    kpis: [
      {
        key: "plan",
        label: "Plan Qty",
        value: activeTotals.planQty,
        helper: "Target produksi aktif",
        tone: "sky",
      },
      {
        key: "order",
        label: "Order Qty",
        value: activeTotals.orderQty,
        helper: "Request masuk",
        tone: "amber",
      },
      {
        key: "confirmed",
        label: "Confirmed Qty",
        value: activeTotals.confirmedQty,
        helper: "Sudah dikonfirmasi delivery",
        tone: "emerald",
      },
      {
        key: "received",
        label: "Received Qty",
        value: activeTotals.receivedQty,
        helper: "Sudah dicek receiving",
        tone: "slate",
      },
      {
        key: "pending",
        label: "Pending Qty",
        value: pendingConfirmQty + pendingReceiveQty,
        helper: "Belum selesai flow",
        tone: "rose",
      },
    ],
    accuracy: [
      {
        label: "Plan Accuracy",
        value: getAccuracyValue(analysisData, "planAccuracy"),
        helper: "Order dibanding plan",
      },
      {
        label: "Order Accuracy",
        value: getAccuracyValue(analysisData, "orderAccuracy"),
        helper: "Confirmed dibanding order",
      },
      {
        label: "Receiving Accuracy",
        value: getAccuracyValue(analysisData, "receivingAccuracy"),
        helper: "Received dibanding confirmed",
      },
    ],
    requestVsConfirmedPerItem: analysisData.requestVsConfirmedPerItem,
    trend: analysisData.rangeQuantity,
    accuracyTrend: createAccuracyTrend(analysisData.rangeQuantity),
    totals: {
      planQty: activeTotals.planQty,
      orderQty: activeTotals.orderQty,
      confirmedQty: activeTotals.confirmedQty,
      receivedQty: activeTotals.receivedQty,
      pendingConfirmQty,
      pendingReceiveQty,
    },
  };
}

function getAccuracyValue(data: AnalysisDashboardData, key: HomeAccuracyKey) {
  return data.kpis.find((kpi) => kpi.key === key)?.value ?? 0;
}

type HomeAccuracyKey = "planAccuracy" | "orderAccuracy" | "receivingAccuracy";

function createAccuracyTrend(points: WeeklyQuantityPoint[]): WeeklyAccuracyPoint[] {
  return points.map((point) => ({
    date: point.date,
    label: point.label,
    planAccuracy: calculateAccuracy(point.orderQty, point.planQty),
    orderAccuracy: calculateAccuracy(point.confirmedQty, point.orderQty),
    receivingAccuracy: calculateAccuracy(point.receivedQty, point.confirmedQty),
  }));
}

function calculateAccuracy(numerator: number, denominator: number) {
  const largerValue = Math.max(numerator, denominator);
  if (largerValue <= 0) {
    return 0;
  }

  return (Math.min(numerator, denominator) / largerValue) * 100;
}

function formatShortDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
