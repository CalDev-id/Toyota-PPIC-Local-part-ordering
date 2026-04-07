"use client";

import type {
  OrderItemSummary,
  OrderingFilter,
  OrderingFilterOptions,
  OrderReportRow,
} from "@/lib/order-report";
import PalletOrderForm from "@/components/ordering/PalletOrderForm";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

type OrderingReportProps = {
  rows: OrderReportRow[];
  summaries: OrderItemSummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const tableColumns: Array<{
  key:
    | keyof OrderReportRow
    | "cb1trOrder"
    | "cb1trDelivery"
    | "cb2trOrder"
    | "cb2trDelivery"
    | "camNo01Order"
    | "camNo01Delivery"
    | "camNo02Order"
    | "camNo02Delivery"
    | "cr1trOrder"
    | "cr1trDelivery"
    | "actions";
  label: string;
  align?: "left" | "right";
}> = [
  { key: "date", label: "Tanggal" },
  { key: "time", label: "Waktu Order" },
  { key: "code", label: "Kode" },
  { key: "truckType", label: "Truck Type" },
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
  { key: "actions", label: "Action" },
];

export default function OrderingReport({
  rows,
  summaries,
  selectedFilter,
  filterOptions,
  errorMessage,
}: OrderingReportProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeModal, setActiveModal] = useState<"junbiki" | "pallet" | null>(null);
  const activeRows = rows.filter((row) => row.statusOrder.toLowerCase() === "submitted");
  const finishedRows = rows.filter((row) => row.statusOrder.toLowerCase() === "confirmed");

  async function handleDelete(orderId: string) {
    try {
      setDeletingId(orderId);

      const res = await fetch(`/api/ordering/${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menghapus order");
      }

      setToast({ type: "success", message: "Order berhasil dihapus" });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      setToast({ type: "error", message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section key={`${selectedFilter.date}-${selectedFilter.shift}-${selectedFilter.dayNight}`} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Ordering Report
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Summary Order</h1>
            <p className="mt-2 text-sm text-slate-600">
              Summary stock awal, plan produksi, cumulative order, dan delivery untuk filter shift yang dipilih.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveModal("junbiki")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Order Junbiki
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("pallet")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Order Pallet
              </button>
            </div>
          </div>

          <form className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]" method="get">
            <FilterField label="Tanggal">
              <SelectField name="date" defaultValue={selectedFilter.date}>
                {filterOptions.dates.map((date) => (
                  <option key={date} value={date}>
                    {formatDateOption(date)}
                  </option>
                ))}
              </SelectField>
            </FilterField>

            <FilterField label="Shift">
              <SelectField name="shift" defaultValue={selectedFilter.shift}>
                {filterOptions.shifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift || "Tanpa Shift"}
                  </option>
                ))}
              </SelectField>
            </FilterField>

            <FilterField label="Day / Night">
              <div className="flex gap-2">
                <SelectField name="dayNight" defaultValue={selectedFilter.dayNight}>
                  {filterOptions.dayNights.map((dayNight) => (
                    <option key={dayNight} value={dayNight}>
                      {dayNight}
                    </option>
                  ))}
                </SelectField>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Terapkan
                </button>
              </div>
            </FilterField>
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
              {/* <MetricRow label="Total Stock" value={summary.totalStock} />
              <MetricRow label="Plan Produksi" value={summary.planProduksi} /> */}
              <MetricRow label="Total Order" value={summary.orderTotal} />
              <MetricRow label="Total Delivery" value={summary.deliveryTotal} />
              <MetricRow
                label="Gap"
                value={summary.gap}
                valueClassName={summary.gap < 0 ? "text-rose-600" : "text-emerald-600"}
              />
            </div>
          </article>
        ))}
      </div>

      <OrderQueueTable
        title="Active Order"
        description={`Order dengan status Submitted untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={activeRows}
        deletingId={deletingId}
        onDelete={handleDelete}
        showDelivery={false}
      />

      <OrderQueueTable
        title="Finish Order"
        description={`Order dengan status Confirmed untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={finishedRows}
        deletingId={deletingId}
        onDelete={handleDelete}
        showDelivery
      />

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[100] max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <p className="text-sm font-semibold">{toast.type === "success" ? "Berhasil" : "Error"}</p>
            <p className="mt-1 text-sm">{toast.message}</p>
          </div>
        </div>
      ) : null}

      {activeModal === "junbiki" ? (
        <OrderingModal title="Order Junbiki" onClose={() => setActiveModal(null)}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-slate-900">Form Junbiki belum tersedia.</p>
            <p className="mt-2 text-sm text-slate-600">
              Tombol ini sekarang tetap dibuka dari halaman ordering utama lewat modal, tetapi backend dan form order Junbiki
              memang belum ada di project saat ini.
            </p>
          </div>
        </OrderingModal>
      ) : null}

      {activeModal === "pallet" ? (
        <OrderingModal title="Order Blank Casting Pallet" onClose={() => setActiveModal(null)} size="wide">
          <PalletOrderForm
            embedded
            onCancel={() => setActiveModal(null)}
            onSuccess={(kodeOrder) => {
              setActiveModal(null);
              setToast({ type: "success", message: `Order ${kodeOrder} berhasil dibuat` });
            }}
          />
        </OrderingModal>
      ) : null}
    </section>
  );
}

function OrderingModal({
  title,
  children,
  onClose,
  size = "default",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl ${
          size === "wide" ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Ordering</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function OrderQueueTable({
  title,
  description,
  rows,
  deletingId,
  onDelete,
  showDelivery,
}: {
  title: string;
  description: string;
  rows: OrderReportRow[];
  deletingId: string | null;
  onDelete: (orderId: string) => void;
  showDelivery: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          Tidak ada data order yang bisa ditampilkan pada section ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                {tableColumns
                  .filter((column) => showDelivery || !String(column.key).toLowerCase().includes("delivery"))
                  .map((column) => (
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
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap text-slate-700">{row.date}</td>
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap text-slate-700">{row.time}</td>
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap font-medium text-slate-900">{row.code}</td>
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap text-slate-700">{row.truckType}</td>
                  <NumericCell value={row.cb1tr.order} />
                  {showDelivery ? <NumericCell value={row.cb1tr.delivery} /> : null}
                  <NumericCell value={row.cb2tr.order} />
                  {showDelivery ? <NumericCell value={row.cb2tr.delivery} /> : null}
                  <NumericCell value={row.camNo01.order} />
                  {showDelivery ? <NumericCell value={row.camNo01.delivery} /> : null}
                  <NumericCell value={row.camNo02.order} />
                  {showDelivery ? <NumericCell value={row.camNo02.delivery} /> : null}
                  <NumericCell value={row.cr1tr.order} />
                  {showDelivery ? <NumericCell value={row.cr1tr.delivery} /> : null}
                  <RemarksCell value={row.remarksJunbikiS2} />
                  <RemarksCell value={row.remarksPalletS2} />
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onDelete(row.orderId)}
                      disabled={deletingId === row.orderId}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === row.orderId ? "Menghapus..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SelectField({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-sky-500"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
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

function formatFilterLabel(value: OrderingFilter) {
  const shift = value.shift || "-";
  const dayNight = value.dayNight || "Kosong";
  return `${formatDateOption(value.date)} / ${shift} / ${dayNight}`;
}

function formatDateOption(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${String(date.getUTCDate()).padStart(2, "0")} ${
    MONTH_NAMES_FULL[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
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
