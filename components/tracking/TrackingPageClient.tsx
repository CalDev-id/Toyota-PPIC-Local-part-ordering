"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type {
  OrderingFilter,
  OrderingFilterOptions,
  TrackingOrderRow,
  TrackingSummary,
} from "@/lib/tracking-report";

type TrackingPageClientProps = {
  initialRows: TrackingOrderRow[];
  initialSummary: TrackingSummary;
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  initialErrorMessage?: string | null;
};

const ITEM_SUMMARY_CONFIGS: Array<{
  key: keyof Pick<TrackingOrderRow, "cb1tr" | "cb2tr" | "camNo01" | "camNo02" | "cr1tr">;
  label: string;
}> = [
  { key: "cb1tr", label: "CB_1TR" },
  { key: "cb2tr", label: "CB_2TR" },
  { key: "camNo01", label: "CAM_01" },
  { key: "camNo02", label: "CAM_02" },
  { key: "cr1tr", label: "CR_1TR" },
];

export default function TrackingPageClient({
  initialRows,
  initialSummary,
  selectedFilter,
  filterOptions,
  initialErrorMessage,
}: TrackingPageClientProps) {
  const rows = initialRows;
  const summary = initialSummary;
  const errorMessage = initialErrorMessage ?? null;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Tracking</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Order Tracking Monitor</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Pantau semua order pada filter terpilih dengan progress submitted, confirmed, sampai checked dari Sunter Plant 1 ke Sunter Plant 2.
            </p>
          </div>

          <AutoSubmitReportFilters selectedFilter={selectedFilter} filterOptions={filterOptions} />
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Submitted" value={summary.submittedOrders} accent="text-amber-600" />
        <SummaryCard label="Confirmed" value={summary.confirmedOrders} accent="text-sky-600" />
        <SummaryCard label="Checked" value={summary.checkedOrders} accent="text-emerald-600" />
        <SummaryCard label="Total Tracking" value={summary.totalOrders} accent="text-slate-900" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Belum ada order pada filter ini</p>
          <p className="mt-2 text-sm text-slate-600">
            Coba ganti tanggal, shift, atau day/night untuk melihat order lain.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map((row) => (
            <TrackingCard key={row.orderId} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackingCard({ row }: { row: TrackingOrderRow }) {
  const normalizedStatus = row.statusOrder.toLowerCase();
  const progress = normalizedStatus === "checked" ? 100 : normalizedStatus === "confirmed" ? 60 : 22;
  const isSubmitted = normalizedStatus === "submitted";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_36%),linear-gradient(135deg,_#ffffff,_#f8fafc_58%,_#eef2ff)] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">{row.kodeOrder}</h2>
              <StatusBadge status={row.statusOrder} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {row.tanggalOrder} • {row.waktuOrder} • Shift {row.shift} • {row.dayNight}
            </p>
          </div>

          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:min-w-[280px]">
            <MetaPill label="Truck Type" value={row.truckType} />
            <MetaPill label="Ritase" value={formatNumber(row.ritaseRequest)} />
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <StepPoint label="Ordering Request" active />
            <StepPoint label="Delivery Confirmed" active={normalizedStatus === "confirmed" || normalizedStatus === "checked"} />
            <StepPoint label="Receiving Checked" active={normalizedStatus === "checked"} />
          </div>

          <div className="relative mt-4 h-10">
            <div className="absolute left-5 right-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
            <div
              className="absolute left-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-400 via-sky-500 to-emerald-500 transition-all duration-700"
              style={{ width: `calc((100% - 2.5rem) * ${progress / 100})` }}
            />
            <div
              className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-[0_10px_24px_rgba(14,165,233,0.16)] transition-all duration-700 ${
                isSubmitted ? "animate-bounce" : ""
              }`}
              style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${progress / 100})` }}
            >
              <TruckIcon />
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            {ITEM_SUMMARY_CONFIGS.map((item) => {
              const metric = row[item.key];

              return (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-900">
                    {formatNumber(metric.order)} | {formatNumber(metric.delivery)} | {formatNumber(metric.received ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    Ord | Con | Rec
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{formatNumber(value)}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const className =
    normalizedStatus === "checked"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalizedStatus === "confirmed"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : normalizedStatus === "submitted"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{status}</span>;
}

function StepPoint({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
          active ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-400"
        }`}
      >
        <PlantIcon />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Step</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-900">{label}</p>
      </div>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function PlantIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3l2 2v3h-5z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}
