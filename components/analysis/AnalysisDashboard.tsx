"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type {
  AnalysisDashboardData,
  AnalysisFilter,
  AnalysisFilterOptions,
  DailyVolumePoint,
  ItemMetricPoint,
  WeeklyPlanRequestConfirmedPoint,
} from "@/lib/analysis";

type AnalysisDashboardProps = {
  data: AnalysisDashboardData;
  selectedFilter: AnalysisFilter;
  filterOptions: AnalysisFilterOptions;
  errorMessage?: string | null;
};

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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Analysis</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Order Analysis Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitoring volume order harian dan perbandingan request vs confirmed.
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

      {/* <RequestConfirmedCircleChart
        title="Request vs Confirmed"
        subtitle={`Per item total untuk ${selectedFilter.shift} / ${selectedFilter.dayNight} pada ${formatDateOption(selectedFilter.date)}.`}
        data={data.requestVsConfirmedPerItem}
      /> */}

      <PlanRequestConfirmedChart
        title="Plan vs Request vs Confirmed"
        subtitle={`Bandingkan target plan dengan request aktual dan qty confirmed per item untuk ${selectedFilter.shift} / ${selectedFilter.dayNight} pada ${formatDateOption(selectedFilter.date)}.`}
        data={data.requestVsConfirmedPerItem}
      />

      <WeeklyPlanRequestConfirmedChart
        title="Plan vs Request vs Confirmed 7 Hari"
        subtitle={`Tren total plan, request, dan confirmed untuk 7 hari ke belakang hingga ${formatDateOption(selectedFilter.date)} pada ${selectedFilter.shift} / ${selectedFilter.dayNight}.`}
        data={data.planRequestConfirmedWeekly}
      />

      {/* <DailyVolumeChart
        title="Tren Request dan Delivery Harian"
        subtitle={`Total request dan total delivery untuk 14 hari hingga ${formatDateOption(selectedFilter.date)}.`}
        data={data.volumeOrderHarian}
      /> */}
    </section>
  );
}

function DailyVolumeChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: DailyVolumePoint[];
}) {
  const width = 1120;
  const height = 320;
  const chartLeft = 48;
  const chartBottom = 248;
  const chartTop = 28;
  const chartRight = 24;
  const maxValue = Math.max(...data.flatMap((item) => [item.requestTotal, item.deliveryTotal]), 1);
  const chartHeight = chartBottom - chartTop;
  const availableWidth = width - chartLeft - chartRight;
  const groupWidth = availableWidth / Math.max(data.length, 1);
  const barWidth = Math.min(22, Math.max(groupWidth / 3.2, 10));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full min-w-[1040px]">
          <line x1={chartLeft} y1={chartBottom} x2={width - chartRight} y2={chartBottom} className="stroke-slate-200" />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} className="stroke-slate-200" />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartBottom - chartHeight * tick;
            const value = Math.round(maxValue * tick);
            return (
              <g key={tick}>
                <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} className="stroke-slate-100" />
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px]">
                  {value}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => {
            const baseX = chartLeft + index * groupWidth + groupWidth / 2;
            const requestHeight = (item.requestTotal / maxValue) * chartHeight;
            const deliveryHeight = (item.deliveryTotal / maxValue) * chartHeight;
            return (
              <g key={item.date}>
                <rect
                  x={baseX - barWidth - 3}
                  y={chartBottom - requestHeight}
                  width={barWidth}
                  height={Math.max(requestHeight, 2)}
                  rx="7"
                  className="fill-sky-500"
                />
                <rect
                  x={baseX + 3}
                  y={chartBottom - deliveryHeight}
                  width={barWidth}
                  height={Math.max(deliveryHeight, 2)}
                  rx="7"
                  className="fill-emerald-500"
                />
                <text x={baseX} y={282} textAnchor="middle" className="fill-slate-500 text-[12px]">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <LegendDot className="bg-sky-500" label="Total Request" />
        <LegendDot className="bg-emerald-500" label="Total Delivery" />
      </div>
    </article>
  );
}

function RequestConfirmedCircleChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ItemMetricPoint[];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600">
        <LegendDot className="bg-sky-500" label="Request" />
        <LegendDot className="bg-emerald-500" label="Confirmed" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.map((item) => (
          <RequestConfirmedCircleCard key={item.key} item={item} />
        ))}
      </div>
    </article>
  );
}

function RequestConfirmedCircleCard({ item }: { item: ItemMetricPoint }) {
  const totalValue = Math.max(item.request + item.confirmed, 1);
  const radius = 56;
  const stroke = 18;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const requestStroke = (item.request / totalValue) * circumference;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
      <div className="mt-4 flex justify-center">
        <svg height="150" width="150" viewBox="0 0 150 150" className="shrink-0">
          <g transform="rotate(-90 75 75)">
            <circle
              stroke="#e2e8f0"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx="75"
              cy="75"
            />
            <circle
              stroke="#0ea5e9"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${requestStroke} ${circumference - requestStroke}`}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="75"
              cy="75"
            />
            <circle
              stroke="#10b981"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference - requestStroke} ${requestStroke}`}
              strokeDashoffset={-requestStroke}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="75"
              cy="75"
            />
          </g>
        </svg>
      </div>

      <div className="mt-3 space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-900">Request {formatNumber(item.request)}</p>
        <p className="text-sm font-semibold text-emerald-600">Confirmed {formatNumber(item.confirmed)}</p>
      </div>
    </div>
  );
}

function PlanRequestConfirmedChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ItemMetricPoint[];
}) {
  const width = 1120;
  const height = 360;
  const chartLeft = 52;
  const chartBottom = 270;
  const chartTop = 28;
  const chartRight = 24;
  const maxValue = Math.max(...data.flatMap((item) => [item.plan, item.request, item.confirmed]), 1);
  const chartHeight = chartBottom - chartTop;
  const availableWidth = width - chartLeft - chartRight;
  const groupWidth = availableWidth / Math.max(data.length, 1);
  const barWidth = Math.min(18, Math.max(groupWidth / 5, 10));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[24rem] w-full min-w-[1040px]">
          <line x1={chartLeft} y1={chartBottom} x2={width - chartRight} y2={chartBottom} className="stroke-slate-200" />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} className="stroke-slate-200" />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartBottom - chartHeight * tick;
            const value = Math.round(maxValue * tick);
            return (
              <g key={tick}>
                <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} className="stroke-slate-100" />
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px]">
                  {value}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => {
            const baseX = chartLeft + index * groupWidth + groupWidth / 2;
            const planHeight = (item.plan / maxValue) * chartHeight;
            const requestHeight = (item.request / maxValue) * chartHeight;
            const confirmedHeight = (item.confirmed / maxValue) * chartHeight;

            return (
              <g key={item.key}>
                <rect
                  x={baseX - barWidth * 1.5 - 6}
                  y={chartBottom - planHeight}
                  width={barWidth}
                  height={Math.max(planHeight, 2)}
                  rx="6"
                  className="fill-slate-400"
                />
                <rect
                  x={baseX - barWidth / 2}
                  y={chartBottom - requestHeight}
                  width={barWidth}
                  height={Math.max(requestHeight, 2)}
                  rx="6"
                  className="fill-sky-500"
                />
                <rect
                  x={baseX + barWidth / 2 + 6}
                  y={chartBottom - confirmedHeight}
                  width={barWidth}
                  height={Math.max(confirmedHeight, 2)}
                  rx="6"
                  className="fill-emerald-500"
                />

                <text x={baseX} y={304} textAnchor="middle" className="fill-slate-600 text-[12px] font-medium">
                  {item.label}
                </text>
                <text
                  x={baseX}
                  y={326}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold ${item.gap > 0 ? "fill-amber-600" : "fill-emerald-600"}`}
                >
                  Gap {formatNumber(item.gap)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <LegendDot className="bg-slate-400" label="Plan" />
        <LegendDot className="bg-sky-500" label="Request" />
        <LegendDot className="bg-emerald-500" label="Confirmed" />
      </div>
    </article>
  );
}

function WeeklyPlanRequestConfirmedChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: WeeklyPlanRequestConfirmedPoint[];
}) {
  const width = 1120;
  const height = 360;
  const chartLeft = 52;
  const chartBottom = 286;
  const chartTop = 28;
  const chartRight = 24;
  const maxValue = Math.max(...data.flatMap((item) => [item.planTotal, item.requestTotal, item.confirmedTotal]), 1);
  const chartHeight = chartBottom - chartTop;
  const availableWidth = width - chartLeft - chartRight;
  const groupWidth = availableWidth / Math.max(data.length, 1);
  const barWidth = Math.min(18, Math.max(groupWidth / 5, 10));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[24rem] w-full min-w-[1040px]">
          <line x1={chartLeft} y1={chartBottom} x2={width - chartRight} y2={chartBottom} className="stroke-slate-200" />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} className="stroke-slate-200" />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartBottom - chartHeight * tick;
            const value = Math.round(maxValue * tick);
            return (
              <g key={tick}>
                <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} className="stroke-slate-100" />
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px]">
                  {value}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => {
            const baseX = chartLeft + index * groupWidth + groupWidth / 2;
            const planHeight = (item.planTotal / maxValue) * chartHeight;
            const requestHeight = (item.requestTotal / maxValue) * chartHeight;
            const confirmedHeight = (item.confirmedTotal / maxValue) * chartHeight;
            const gap = item.requestTotal - item.confirmedTotal;

            return (
              <g key={item.date}>
                <rect
                  x={baseX - barWidth * 1.5 - 6}
                  y={chartBottom - planHeight}
                  width={barWidth}
                  height={Math.max(planHeight, 2)}
                  rx="6"
                  className="fill-slate-400"
                />
                <rect
                  x={baseX - barWidth / 2}
                  y={chartBottom - requestHeight}
                  width={barWidth}
                  height={Math.max(requestHeight, 2)}
                  rx="6"
                  className="fill-sky-500"
                />
                <rect
                  x={baseX + barWidth / 2 + 6}
                  y={chartBottom - confirmedHeight}
                  width={barWidth}
                  height={Math.max(confirmedHeight, 2)}
                  rx="6"
                  className="fill-emerald-500"
                />

                <text x={baseX} y={320} textAnchor="middle" className="fill-slate-600 text-[12px] font-medium">
                  {item.label}
                </text>
                <text
                  x={baseX}
                  y={342}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold ${gap > 0 ? "fill-amber-600" : "fill-emerald-600"}`}
                >
                  Gap {formatNumber(gap)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <LegendDot className="bg-slate-400" label="Plan" />
        <LegendDot className="bg-sky-500" label="Request" />
        <LegendDot className="bg-emerald-500" label="Confirmed" />
      </div>
    </article>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function formatDateOption(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}
