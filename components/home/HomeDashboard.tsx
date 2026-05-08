import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type { HomeDashboardData, HomeKpi, HomeKpiKey } from "@/lib/home-dashboard";
import type { WeeklyQuantityPoint } from "@/lib/analysis";
import type React from "react";

type HomeDashboardProps = {
  data: HomeDashboardData;
  errorMessage?: string | null;
};

type LineSeries = {
  key: string;
  label: string;
  color: string;
  getValue: (point: WeeklyQuantityPoint) => number;
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

const trendSeries: LineSeries[] = [
  { key: "plan", label: "Plan", color: "#0ea5e9", getValue: (point) => point.planQty },
  { key: "order", label: "Order", color: "#f59e0b", getValue: (point) => point.orderQty },
  { key: "confirmed", label: "Confirmed", color: "#10b981", getValue: (point) => point.confirmedQty },
  { key: "received", label: "Received", color: "#64748b", getValue: (point) => point.receivedQty },
];

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <TrendChart title="Achievement" data={data.trend} series={trendSeries} />
        <PlanCoverageChart data={data} />
      </section>
    </section>
  );
}

function KpiCard({ kpi }: { kpi: HomeKpi }) {
  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{kpi.label}</p>
          <p className="mt-3 text-3xl font-bold leading-none text-slate-950 tabular-nums">
            {formatQuantity(kpi.value)}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${kpiToneClassMap[kpi.tone]}`}>
          {kpiIconMap[kpi.key]}
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{kpi.helper}</p>
    </article>
  );
}

function TrendChart({
  title,
  data,
  series,
}: {
  title: string;
  data: WeeklyQuantityPoint[];
  series: LineSeries[];
}) {
  const width = 920;
  const height = 330;
  const chartLeft = 58;
  const chartRight = 26;
  const chartTop = 46;
  const chartBottom = 260;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = chartBottom - chartTop;
  const rawMax = Math.max(...data.flatMap((point) => series.map((item) => item.getValue(point))), 1);
  const yMax = getRoundedMax(rawMax);
  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function getX(index: number) {
    return chartLeft + index * xStep;
  }

  function getY(value: number) {
    return chartBottom - (Math.min(value, yMax) / yMax) * chartHeight;
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Plan, order, confirmed, dan received</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
          {series.map((item) => (
            <LegendItem key={item.key} color={item.color} label={item.label} />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[20rem] w-full min-w-[820px]">
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
            ? series.map((item) => {
                const points = data.map((point, index) => `${getX(index)},${getY(item.getValue(point))}`).join(" ");

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
                    {data.map((point, index) => (
                      <circle
                        key={`${item.key}-${point.date}`}
                        cx={getX(index)}
                        cy={getY(item.getValue(point))}
                        r="5"
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                );
              })
            : null}

          {data.map((point, index) => (
            <text key={point.date} x={getX(index)} y={chartBottom + 30} textAnchor="middle" className="fill-slate-600 text-[12px]">
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </article>
  );
}

function PlanCoverageChart({ data }: { data: HomeDashboardData }) {
  const planQty = data.totals.planQty;
  const coverageTotal = Math.max(
    data.totals.planQty,
    data.totals.orderQty,
    data.totals.confirmedQty,
    data.totals.receivedQty
  );
  const receivedQty = Math.min(data.totals.receivedQty, data.totals.planQty);
  const confirmedNotReceivedQty = Math.max(
    Math.min(data.totals.confirmedQty, data.totals.planQty) - receivedQty,
    0
  );
  const orderNotConfirmedQty = Math.max(
    Math.min(data.totals.orderQty, data.totals.planQty) - receivedQty - confirmedNotReceivedQty,
    0
  );
  const planNotOrderedQty = Math.max(
    data.totals.planQty - receivedQty - confirmedNotReceivedQty - orderNotConfirmedQty,
    0
  );
  const overPlanQty = Math.max(coverageTotal - planQty, 0);
  const segments = [
    { label: "Received", value: receivedQty, color: "#64748b" },
    { label: "Confirmed", value: confirmedNotReceivedQty, color: "#10b981" },
    { label: "Ordered", value: orderNotConfirmedQty, color: "#f59e0b" },
    { label: "Remaining Plan", value: planNotOrderedQty, color: "#0ea5e9" },
    { label: "Over Plan", value: overPlanQty, color: "#e11d48" },
  ];
  const radius = 72;
  const stroke = 26;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  let offset = 0;

  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Plan Coverage</h2>
      <p className="mt-1 text-sm text-slate-500">Posisi order, confirmed, dan received terhadap plan hari ini.</p>

      <div className="mt-5 flex justify-center">
        <svg height="210" width="210" viewBox="0 0 210 210" className="shrink-0">
          <g transform="rotate(-90 105 105)">
            <circle
              stroke="#e2e8f0"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx="105"
              cy="105"
            />
            {coverageTotal > 0
              ? segments.map((segment) => {
                  const length = (segment.value / coverageTotal) * circumference;
                  const dashOffset = -offset;
                  offset += length;

                  return (
                    <circle
                      key={segment.label}
                      stroke={segment.color}
                      fill="transparent"
                      strokeWidth={stroke}
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={dashOffset}
                      r={normalizedRadius}
                      cx="105"
                      cy="105"
                    />
                  );
                })
              : null}
          </g>
          <text x="105" y="99" textAnchor="middle" className="fill-slate-950 text-2xl font-bold">
            {formatQuantity(planQty)}
          </text>
          <text x="105" y="122" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
            Plan Qty
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {segments.filter((segment) => segment.value > 0 || segment.label !== "Over Plan").map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
          </span>
        ))}
      </div>
      {overPlanQty > 0 ? (
        <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          Aktual melebihi plan sebesar {formatQuantity(overPlanQty)} qty.
        </p>
      ) : null}
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
