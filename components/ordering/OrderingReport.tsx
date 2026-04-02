"use client";

import type { OrderItemSummary, OrderReportRow } from "@/lib/order-report";

type OrderingReportProps = {
  rows: OrderReportRow[];
  summaries: OrderItemSummary[];
  selectedMonth: string;
  errorMessage?: string | null;
};

const tableColumns: Array<{
  key: keyof OrderReportRow | "cb1trOrder" | "cb1trDelivery" | "cb2trOrder" | "cb2trDelivery" | "camNo01Order" | "camNo01Delivery" | "camNo02Order" | "camNo02Delivery" | "cr1trOrder" | "cr1trDelivery";
  label: string;
  align?: "left" | "right";
}> = [
  { key: "date", label: "Tanggal" },
  { key: "time", label: "Waktu Order" },
  { key: "code", label: "Kode" },
  { key: "cb1trOrder", label: "Ord CB 1TR", align: "right" },
  { key: "cb1trDelivery", label: "Delv CB 1TR", align: "right" },
  { key: "cb2trOrder", label: "Ord CB 2TR", align: "right" },
  { key: "cb2trDelivery", label: "Delv CB 2TR", align: "right" },
  { key: "camNo01Order", label: "Ord CA 01", align: "right" },
  { key: "camNo01Delivery", label: "Delv CA 01", align: "right" },
  { key: "camNo02Order", label: "Ord CA 02", align: "right" },
  { key: "camNo02Delivery", label: "Delv CA 02", align: "right" },
  { key: "cr1trOrder", label: "Ord CR 1TR", align: "right" },
  { key: "cr1trDelivery", label: "Delv CR 1TR", align: "right" },
  { key: "remarksJunbikiS2", label: "Remarks Junbiki S2" },
  { key: "remarksPalletS2", label: "Remarks Pallet S2" },
];

export default function OrderingReport({
  rows,
  summaries,
  selectedMonth,
  errorMessage,
}: OrderingReportProps) {
  return (
    <section key={selectedMonth} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Ordering Report
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Summary Order vs Delivery
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ringkasan cumulative order, delivery, dan gap untuk item blank casting dari tabel{" "}
              <span className="font-semibold text-slate-800">Order_Record</span>.
            </p>
          </div>

          <form
            key={selectedMonth}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            method="get"
          >
            <div>
              <label
                htmlFor="month"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Filter Bulan
              </label>
              <input
                key={selectedMonth}
                id="month"
                name="month"
                type="month"
                defaultValue={selectedMonth}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Terapkan
            </button>
          </form>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaries.map((summary) => (
          <article
            key={summary.key}
            className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {summary.label}
            </p>
            <div className="mt-4 space-y-3">
              <MetricRow label="Cumulative Order" value={summary.orderTotal} />
              <MetricRow label="Cumulative Delivery" value={summary.deliveryTotal} />
              <MetricRow
                label="Gap"
                value={summary.gap}
                valueClassName={summary.gap < 0 ? "text-rose-600" : "text-emerald-600"}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Detail Report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Menampilkan {rows.length} record order aktual pada bulan {formatMonthLabel(selectedMonth)}.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Tidak ada data order yang bisa ditampilkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100/90 text-slate-700">
                <tr>
                  {tableColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.code}-${row.rawDate}-${row.time}-${index}`}
                    className="align-top odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.date}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap text-slate-700">
                      {row.time}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {row.code}
                    </td>
                    <NumericCell value={row.cb1tr.order} />
                    <NumericCell value={row.cb1tr.delivery} />
                    <NumericCell value={row.cb2tr.order} />
                    <NumericCell value={row.cb2tr.delivery} />
                    <NumericCell value={row.camNo01.order} />
                    <NumericCell value={row.camNo01.delivery} />
                    <NumericCell value={row.camNo02.order} />
                    <NumericCell value={row.camNo02.delivery} />
                    <NumericCell value={row.cr1tr.order} />
                    <NumericCell value={row.cr1tr.delivery} />
                    <RemarksCell value={row.remarksJunbikiS2} />
                    <RemarksCell value={row.remarksPalletS2} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold text-slate-900 ${valueClassName ?? ""}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}

function NumericCell({ value }: { value: number }) {
  return (
    <td className="border-b border-slate-200 px-4 py-3 text-right whitespace-nowrap text-slate-700">
      {formatNumber(value)}
    </td>
  );
}

function RemarksCell({ value }: { value: string }) {
  return (
    <td className="border-b border-slate-200 px-4 py-3 text-left text-slate-700">
      <div className="min-w-[220px] whitespace-pre-wrap break-words">{value}</div>
    </td>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${MONTH_NAMES_FULL[month - 1]} ${year}`;
}

const MONTH_NAMES_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
