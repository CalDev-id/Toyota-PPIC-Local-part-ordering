"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type { HomeDashboardData, HomeKpi, HomeKpiKey } from "@/lib/home-dashboard";
import type { ItemMetricPoint } from "@/lib/analysis";
import { useState } from "react";
import type React from "react";

type HomeDashboardProps = {
  data: HomeDashboardData;
  errorMessage?: string | null;
};

const kpiToneClassMap: Record<HomeKpi["tone"], string> = {
  sky: "bg-sky-50 text-sky-700 border-sky-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
};

const kpiIconMap: Record<HomeKpiKey, React.ReactNode> = {
  plan: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  order: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 7.5h16" />
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  ),
  confirmed: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 7h10v10H3z" />
      <path d="M13 10h3l3 3v4h-6" />
      <path d="m7 13 2 2 4-5" />
    </svg>
  ),
  received: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" />
      <path d="M4 7.5v9L12 21l8-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  ),
};

export default function HomeDashboard({ data, errorMessage }: HomeDashboardProps) {
  return (
    <section className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Home Dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">CCR Ordering Overview</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Ringkasan plan, ordering, delivery, dan receiving untuk periode aktif.
            </p>
          </div>
          <AutoSubmitReportFilters
            selectedFilter={data.filter}
            filterOptions={data.filterOptions}
            className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]"
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.filter((kpi) => kpi.key !== "pending").map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PlanOrderConfirmedReceivedChart data={data.requestVsConfirmedPerItem} />
        <div className="w-full max-w-[360px] justify-self-center xl:justify-self-end">
          <PlanCoverageChart data={data} />
        </div>
      </section>
    </section>
  );
}

function KpiCard({ kpi }: { kpi: HomeKpi }) {
  return (
    <article className="h-full min-h-[160px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{kpi.label}</p>
          <p className="mt-4 text-4xl font-bold leading-none text-slate-950 tabular-nums">
            {formatQuantity(kpi.value)}
          </p>
        </div>
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border ${kpiToneClassMap[kpi.tone]}`}>
          {kpiIconMap[kpi.key]}
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-slate-500">{kpi.helper}</p>
    </article>
  );
}

function PlanOrderConfirmedReceivedChart({
  data,
}: {
  data: ItemMetricPoint[];
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    item: string;
    label: string;
    value: number;
    color: string;
  } | null>(null);
  const width = 920;
  const height = 350;
  const chartLeft = 58;
  const chartRight = 26;
  const chartTop = 58;
  const chartBottom = 282;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = chartBottom - chartTop;
  const rawMax = Math.max(...data.flatMap((item) => [item.plan, item.request, item.confirmed, item.received]), 1);
  const yMax = getRoundedMax(rawMax);
  const groupWidth = chartWidth / Math.max(data.length, 1);
  const barGap = 5;
  const rawBarWidth = (groupWidth - barGap * 3) / 5.2;
  const barWidth = Math.min(18, Math.max(rawBarWidth, 8));
  const groupPadding = Math.max((groupWidth - barWidth * 4 - barGap * 3) / 2, 8);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function getGroupX(index: number) {
    return chartLeft + index * groupWidth;
  }

  function getBarX(groupIndex: number, barIndex: number) {
    return getGroupX(groupIndex) + groupPadding + barIndex * (barWidth + barGap);
  }

  function getY(value: number) {
    return chartBottom - (Math.min(value, yMax) / yMax) * chartHeight;
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Plan vs Order vs Confirmed vs Received</h2>
          <p className="mt-1 text-sm text-slate-500">Bandingkan target plan, order aktual, qty confirmed, dan received per item.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-medium text-slate-600 sm:flex sm:flex-wrap">
          <LegendItem color="#94a3b8" label="Plan" />
          <LegendItem color="#0ea5e9" label="Order" />
          <LegendItem color="#10b981" label="Confirmed" />
          <LegendItem color="#64748b" label="Received" />
        </div>
      </div>

      <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" onMouseLeave={() => setTooltip(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[18.5rem] w-full min-w-[680px] sm:h-[21.5rem] sm:min-w-[820px]">
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#e2e8f0" strokeWidth="2" />
          <line x1={chartLeft} y1={chartBottom} x2={width - chartRight} y2={chartBottom} stroke="#e2e8f0" strokeWidth="2" />

          {ticks.map((tick) => {
            const y = chartBottom - chartHeight * tick;
            const value = yMax * tick;

            return (
              <g key={tick}>
                <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={chartLeft - 12} y={y + 4} textAnchor="end" className="fill-slate-500 text-[12px]">
                  {formatCompactQuantity(value)}
                </text>
              </g>
            );
          })}

          {data.length === 0 ? (
            <text x={width / 2} y={(chartTop + chartBottom) / 2} textAnchor="middle" className="fill-slate-400 text-[14px]">
              Belum ada data
            </text>
          ) : null}

          {data.length > 0
            ? data.map((item, index) => {
                const bars = [
                  { key: "plan", label: "Plan", value: item.plan, color: "#94a3b8" },
                  { key: "order", label: "Order", value: item.request, color: "#0ea5e9" },
                  { key: "confirmed", label: "Confirmed", value: item.confirmed, color: "#10b981" },
                  { key: "received", label: "Received", value: item.received, color: "#64748b" },
                ];

                return (
                  <g key={item.key}>
                    {bars.map((bar, barIndex) => {
                      const y = getY(bar.value);

                      const x = getBarX(index, barIndex);
                      const barHeight = Math.max(chartBottom - y, 2);

                      return (
                        <g key={bar.key}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="4"
                            fill={bar.color}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            onMouseEnter={() =>
                              setTooltip({
                                x: ((x + barWidth / 2) / width) * 100,
                                y: (Math.max(y - 10, chartTop) / height) * 100,
                                item: item.label,
                                label: bar.label,
                                value: bar.value,
                                color: bar.color,
                              })
                            }
                            onFocus={() =>
                              setTooltip({
                                x: ((x + barWidth / 2) / width) * 100,
                                y: (Math.max(y - 10, chartTop) / height) * 100,
                                item: item.label,
                                label: bar.label,
                                value: bar.value,
                                color: bar.color,
                              })
                            }
                            onMouseLeave={() => setTooltip(null)}
                          />
                          <text
                            x={x + barWidth / 2}
                            y={Math.max(y - 7, chartTop - 10)}
                            textAnchor="middle"
                            className="text-[10px] font-semibold tabular-nums"
                            fill={bar.color}
                            stroke="white"
                            strokeWidth="3"
                            paintOrder="stroke"
                          >
                            {formatQuantity(bar.value)}
                          </text>
                        </g>
                      );
                    })}
                    <text
                      x={getGroupX(index) + groupWidth / 2}
                      y={chartBottom + 30}
                      textAnchor="middle"
                      className="fill-slate-600 text-[12px]"
                    >
                      {item.label}
                    </text>
                    <text
                      x={getGroupX(index) + groupWidth / 2}
                      y={chartBottom + 50}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold ${item.gap > 0 ? "fill-amber-600" : "fill-emerald-600"}`}
                    >
                      Gap {formatCompactQuantity(item.gap)}
                    </text>
                  </g>
                );
              })
            : null}

          {data.length === 0 ? (
            <text x={width / 2} y={(chartTop + chartBottom) / 2} textAnchor="middle" className="fill-slate-400 text-[14px]">
              Belum ada data
            </text>
          ) : null}
        </svg>
        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${tooltip.x}%`,
              top: `${tooltip.y}%`,
            }}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} />
              <span>{tooltip.item}</span>
            </div>
            <p className="mt-1 text-slate-600">
              {tooltip.label}: <span className="font-semibold text-slate-900">{formatQuantity(tooltip.value)}</span>
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PlanCoverageChart({ data }: { data: HomeDashboardData }) {
  const orderQty = data.totals.orderQty;
  const deliveryQty = data.totals.confirmedQty;
  const gapQty = Math.max(orderQty - deliveryQty, 0);
  const progress = orderQty > 0 ? Math.min((deliveryQty / orderQty) * 100, 100) : 0;
  const progressLabel = formatCoveragePercent(progress, gapQty);

  return (
    <article className="h-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Order Coverage</h2>
          <p className="mt-1 text-sm text-slate-500">Delivery completed from order quantity</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            gapQty <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {progressLabel}
        </span>
      </div>

      <div
        className="mx-auto mt-8 grid h-52 w-52 place-items-center rounded-full border border-sky-100 p-[18px] shadow-inner"
        style={{
          background: `conic-gradient(#0ea5e9 ${Math.min(Math.max(progress, 0), 100)}%, #e0f2fe 0)`,
        }}
      >
        <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-3xl font-semibold text-slate-950">{progressLabel}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Progress</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 p-4 text-center">
        {[
          ["Order", formatQuantity(orderQty)],
          ["Delivery", formatQuantity(deliveryQty)],
          ["Gap", formatQuantity(gapQty)],
        ].map(([label, value]) => (
          <div key={label} className="px-2">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 tabular-nums">{value}</p>
          </div>
        ))}
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

function getRoundedMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.max(Math.floor(Math.log10(value)) - 1, 0);
  return Math.ceil(value / magnitude) * magnitude;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}

function formatCompactQuantity(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }

  return formatQuantity(value);
}

function formatCoveragePercent(value: number, gapQty: number) {
  if (gapQty <= 0 && value >= 100) {
    return "100%";
  }

  if (value >= 99 && value < 100) {
    return `${Math.floor(value * 10) / 10}%`;
  }

  return `${Math.floor(value)}%`;
}
