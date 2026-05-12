"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type {
  AnalysisDashboardData,
  AnalysisFilter,
  AnalysisFilterOptions,
  AnalysisKpiKey,
  AnalysisKpiSummary,
} from "@/lib/analysis";
import { useState } from "react";

type AnalysisDashboardProps = {
  data: AnalysisDashboardData;
  selectedFilter: AnalysisFilter;
  filterOptions: AnalysisFilterOptions;
  errorMessage?: string | null;
};

type LineSeries<T> = {
  key: string;
  label: string;
  color: string;
  getValue: (point: T) => number;
};

const kpiIconMap: Record<AnalysisKpiKey, "target" | "clipboard" | "box"> = {
  planAccuracy: "target",
  orderAccuracy: "clipboard",
  receivingAccuracy: "box",
};

const seriesColors = {
  plan: "#0ea5e9",
  order: "#f59e0b",
  confirmed: "#10b981",
  received: "#64748b",
} as const;

export default function AnalysisDashboard({
  data,
  selectedFilter,
  filterOptions,
  errorMessage,
}: AnalysisDashboardProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Analysis</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Order Analysis Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitoring akurasi plan, order, dan receiving untuk filter aktif.
            </p>
          </div>

          <AutoSubmitReportFilters
            selectedFilter={selectedFilter}
            filterOptions={filterOptions}
            className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-3">
        <AnalysisColumn
          kpi={getKpi(data.kpis, "planAccuracy")}
          chartTitle="Plan vs Order (Qty)"
          chartData={data.weeklyQuantity}
          chartSeries={[
            { key: "plan", label: "Plan Qty", color: seriesColors.plan, getValue: (point) => point.planQty },
            { key: "order", label: "Order Qty", color: seriesColors.order, getValue: (point) => point.orderQty },
          ]}
        />
        <AnalysisColumn
          kpi={getKpi(data.kpis, "orderAccuracy")}
          chartTitle="Order vs Confirmed (Qty)"
          chartData={data.weeklyQuantity}
          chartSeries={[
            { key: "order", label: "Order Qty", color: seriesColors.order, getValue: (point) => point.orderQty },
            { key: "confirmed", label: "Confirmed Qty", color: seriesColors.confirmed, getValue: (point) => point.confirmedQty },
          ]}
        />
        <AnalysisColumn
          kpi={getKpi(data.kpis, "receivingAccuracy")}
          chartTitle="Confirmed vs Receiving (Qty)"
          chartData={data.weeklyQuantity}
          chartSeries={[
            { key: "confirmed", label: "Confirmed Qty", color: seriesColors.confirmed, getValue: (point) => point.confirmedQty },
            { key: "received", label: "Received Qty", color: seriesColors.received, getValue: (point) => point.receivedQty },
          ]}
        />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Trend Per Item</h2>
          <p className="mt-1 text-sm text-slate-500">Plan, order, confirmed, dan received per item dalam 7 hari ke belakang.</p>
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          {data.weeklyItemQuantity.map((item) => (
            <MultiLineChart
              key={item.key}
              title={item.label}
              data={item.points}
              valueFormatter={formatCompactQuantity}
              series={[
                { key: "plan", label: "Plan", color: seriesColors.plan, getValue: (point) => point.planQty },
                { key: "order", label: "Order", color: seriesColors.order, getValue: (point) => point.orderQty },
                { key: "confirmed", label: "Confirmed", color: seriesColors.confirmed, getValue: (point) => point.confirmedQty },
                { key: "received", label: "Received", color: seriesColors.received, getValue: (point) => point.receivedQty },
              ]}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

function AnalysisColumn({
  kpi,
  chartTitle,
  chartData,
  chartSeries,
}: {
  kpi: AnalysisKpiSummary;
  chartTitle: string;
  chartData: AnalysisDashboardData["weeklyQuantity"];
  chartSeries: Array<LineSeries<AnalysisDashboardData["weeklyQuantity"][number]>>;
}) {
  return (
    <div className="min-w-0 space-y-5">
      <KpiCard kpi={kpi} icon={kpiIconMap[kpi.key]} />
      <MultiLineChart
        title={chartTitle}
        data={chartData}
        valueFormatter={formatCompactQuantity}
        series={chartSeries}
      />
    </div>
  );
}

function KpiCard({
  kpi,
  icon,
}: {
  kpi: AnalysisKpiSummary;
  icon: "target" | "clipboard" | "box";
}) {
  const isPositive = kpi.delta >= 0;

  return (
    <article className="flex min-h-[132px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[150px] sm:gap-6 sm:p-6">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 sm:h-24 sm:w-24">
        <KpiIcon icon={icon} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-950 sm:text-lg">{kpi.label}</h2>
        <p className="mt-2 text-3xl font-bold leading-none text-sky-600 tabular-nums sm:text-4xl">
          {formatPercent(kpi.value)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-slate-500">vs last week</span>
          <span className={`font-bold tabular-nums ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
            {isPositive ? "▲" : "▼"} {formatDelta(Math.abs(kpi.delta))}
          </span>
        </div>
      </div>
    </article>
  );
}

function getKpi(kpis: AnalysisKpiSummary[], key: AnalysisKpiKey) {
  return kpis.find((kpi) => kpi.key === key) ?? { key, label: getKpiLabel(key), value: 0, delta: 0 };
}

function getKpiLabel(key: AnalysisKpiKey) {
  const labels: Record<AnalysisKpiKey, string> = {
    planAccuracy: "Plan Accuracy",
    orderAccuracy: "Order Accuracy",
    receivingAccuracy: "Receiving Accuracy",
  };

  return labels[key];
}

function MultiLineChart<T extends { date: string; label: string }>({
  title,
  data,
  series,
  maxValue,
  valueFormatter,
}: {
  title: string;
  data: T[];
  series: Array<LineSeries<T>>;
  maxValue?: number;
  valueFormatter: (value: number) => string;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    placement: "top" | "bottom";
    label: string;
    seriesLabel: string;
    value: number;
    color: string;
  } | null>(null);
  const width = 520;
  const height = 320;
  const chartLeft = 56;
  const chartRight = 24;
  const chartTop = 46;
  const chartBottom = 252;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = chartBottom - chartTop;
  const safeData = data;
  const rawMax = Math.max(...safeData.flatMap((point) => series.map((item) => item.getValue(point))), 1);
  const yMax = maxValue ?? getRoundedMax(rawMax);
  const xStep = chartWidth / Math.max(safeData.length - 1, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function getX(index: number) {
    return chartLeft + index * xStep;
  }

  function getY(value: number) {
    return chartBottom - (Math.min(value, yMax) / yMax) * chartHeight;
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-medium text-slate-600 sm:flex sm:flex-wrap sm:gap-x-5">
        {series.map((item) => (
          <LegendItem key={item.key} color={item.color} label={item.label} />
        ))}
      </div>

      <div className="relative -mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" onMouseLeave={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[17.5rem] w-full min-w-[420px] sm:h-[20rem] sm:min-w-[460px]">
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#e2e8f0" strokeWidth="2" />
          <line x1={chartLeft} y1={chartBottom} x2={width - chartRight} y2={chartBottom} stroke="#e2e8f0" strokeWidth="2" />

          {ticks.map((tick) => {
            const y = chartBottom - chartHeight * tick;
            const value = yMax * tick;
            return (
              <g key={tick}>
                <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={chartLeft - 12} y={y + 4} textAnchor="end" className="fill-slate-500 text-[12px]">
                  {valueFormatter(value)}
                </text>
              </g>
            );
          })}

          {safeData.length === 0 ? (
            <text x={width / 2} y={(chartTop + chartBottom) / 2} textAnchor="middle" className="fill-slate-400 text-[14px]">
              Belum ada data
            </text>
          ) : null}

          {safeData.length > 0 ? series.map((item) => {
            const points = safeData.map((point, index) => `${getX(index)},${getY(item.getValue(point))}`).join(" ");

            return (
              <g key={item.key}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {safeData.map((point, index) => {
                  const value = item.getValue(point);
                  const x = getX(index);
                  const y = getY(value);

                  return (
                    <circle
                      key={`${item.key}-${point.date}`}
                      cx={x}
                      cy={y}
                      r="6"
                      fill={item.color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseEnter={() =>
                        setTooltip({
                          x: (x / width) * 100,
                          y: ((y < chartTop + 34 ? y + 16 : y - 10) / height) * 100,
                          placement: y < chartTop + 34 ? "bottom" : "top",
                          label: point.label,
                          seriesLabel: item.label,
                          value,
                          color: item.color,
                        })
                      }
                      onFocus={() =>
                        setTooltip({
                          x: (x / width) * 100,
                          y: ((y < chartTop + 34 ? y + 16 : y - 10) / height) * 100,
                          placement: y < chartTop + 34 ? "bottom" : "top",
                          label: point.label,
                          seriesLabel: item.label,
                          value,
                          color: item.color,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </g>
            );
          }) : null}

          {safeData.map((point, index) => (
            <text key={point.date} x={getX(index)} y={chartBottom + 30} textAnchor="middle" className="fill-slate-600 text-[12px]">
              {point.label}
            </text>
          ))}
        </svg>
        {tooltip ? (
          <div
            className={`pointer-events-none absolute z-10 -translate-x-[var(--tooltip-translate-x)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg ${
              tooltip.placement === "top" ? "-translate-y-full" : "translate-y-0"
            }`}
            style={{
              left: `${tooltip.x}%`,
              top: `${tooltip.y}%`,
              ["--tooltip-translate-x" as string]: getTooltipTranslateX(tooltip.x),
            }}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} />
              <span>{tooltip.label}</span>
            </div>
            <p className="mt-1 text-slate-600">
              {tooltip.seriesLabel}: <span className="font-semibold text-slate-900">{formatQuantity(tooltip.value)}</span>
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

function KpiIcon({ icon }: { icon: "target" | "clipboard" | "box" }) {
  const commonProps = {
    className: "h-11 w-11 sm:h-16 sm:w-16",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 3.2,
    viewBox: "0 0 64 64",
  };

  if (icon === "clipboard") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M23 12h18" />
        <path d="M24 10h16v8H24z" />
        <path d="M18 15h-4v40h27" />
        <path d="M46 15h4v22" />
        <path d="M23 28h14" />
        <path d="M23 38h10" />
        <circle cx="45" cy="47" r="11" fill="currentColor" stroke="none" />
        <path d="m40 47 4 4 8-9" className="stroke-white" />
      </svg>
    );
  }

  if (icon === "box") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="m16 22 16-9 16 9-16 9z" />
        <path d="M16 22v19l16 10V31" />
        <path d="M48 22v16" />
        <circle cx="46" cy="46" r="11" fill="currentColor" stroke="none" />
        <path d="m41 46 4 4 8-9" className="stroke-white" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} aria-hidden="true">
      <circle cx="28" cy="36" r="20" />
      <circle cx="28" cy="36" r="12" />
      <circle cx="28" cy="36" r="5" fill="currentColor" stroke="none" />
      <path d="M42 22 55 9" />
      <path d="M47 9h8v8" />
    </svg>
  );
}

function getRoundedMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.max(Math.floor(Math.log10(value)) - 1, 0);
  return Math.ceil(value / magnitude) * magnitude;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number) {
  return `${value.toFixed(1)}%`;
}

function getTooltipTranslateX(x: number) {
  if (x > 82) {
    return "100%";
  }

  if (x < 18) {
    return "0%";
  }

  return "50%";
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}

function formatCompactQuantity(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }

  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}
