"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type {
  OrderingFilter,
  OrderingFilterOptions,
  ReceivingMetricKey,
  ReceivingQueueRow,
  ReceivingSummary,
} from "@/lib/receiving-report";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ReceivingCheckMode = "match" | "reject" | "neutral";

type ReceivingReportProps = {
  activeOrders: ReceivingQueueRow[];
  finishedOrders: ReceivingQueueRow[];
  summary: ReceivingSummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
};

export default function ReceivingReport({
  activeOrders,
  finishedOrders,
  summary,
  selectedFilter,
  filterOptions,
  errorMessage,
}: ReceivingReportProps) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<ReceivingQueueRow | null>(null);
  const [receivedValues, setReceivedValues] = useState<Record<string, string>>({});
  const [remarkValues, setRemarkValues] = useState<Record<string, string>>({});
  const [checkModes, setCheckModes] = useState<Record<string, ReceivingCheckMode>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  function openCheckModal(order: ReceivingQueueRow) {
    setSelectedOrder(order);
    setReceivedValues(Object.fromEntries(order.items.map((item) => [item.itemCode, String(item.qtyReceived || "")])));
    setRemarkValues(Object.fromEntries(order.items.map((item) => [item.itemCode, item.remarksDelivery])));
    setCheckModes(
      Object.fromEntries(
        order.items.map((item) => [
          item.itemCode,
          getReceivingCheckMode(String(item.qtyReceived || ""), item.remarksDelivery, item.qtyConfirm),
        ])
      )
    );
    setFormError("");
  }

  function closeCheckModal() {
    if (saving) {
      return;
    }

    setSelectedOrder(null);
    setReceivedValues({});
    setRemarkValues({});
    setCheckModes({});
    setFormError("");
  }

  async function handleCheckSubmit() {
    if (!selectedOrder) {
      return;
    }

    const invalidItem = selectedOrder.items.find((item) => {
      const rawValue = receivedValues[item.itemCode] ?? "";
      const value = rawValue.trim() === "" ? 0 : Number(rawValue);
      return !Number.isFinite(value) || value < 0;
    });

    if (invalidItem) {
      setFormError(`Qty received pada ${invalidItem.itemCode} tidak valid`);
      return;
    }

    const incompleteItem = selectedOrder.items.find((item) => {
      const rawQty = receivedValues[item.itemCode] ?? "";
      const rawRemark = remarkValues[item.itemCode] ?? "";

      return rawQty.trim() === "" || rawRemark.trim() === "";
    });

    if (incompleteItem) {
      setFormError(`Qty received dan remarks pada ${incompleteItem.itemCode} wajib diisi`);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const res = await fetch(`/api/receiving/${selectedOrder.orderId}/check`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedOrder.items.map((item) => ({
            itemCode: item.itemCode,
            qtyReceived: Number(receivedValues[item.itemCode] ?? "") || 0,
            remarksDelivery: remarkValues[item.itemCode] ?? "",
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan receiving order");
      }

      closeCheckModal();
      setToastMessage(`Order ${selectedOrder.kodeOrder} berhasil di-check receiving`);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage("");
        toastTimeoutRef.current = null;
      }, 3200);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Receiving Queue
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Summary Receiving</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor order confirmed dari delivery, input qty received, dan pantau order yang sudah checked.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <SummaryCard
            key={item.key}
            label={item.label}
            totalConfirmed={item.totalConfirmed}
            totalReceived={item.totalReceived}
            gap={item.gap}
          />
        ))}
      </div>

      <QueueTable
        title="Active Receiving"
        description={`Order dengan status Confirmed untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={activeOrders}
        showReceived={false}
        onCheck={openCheckModal}
      />

      <QueueTable
        title="Finish Receiving"
        description={`Order dengan status Checked untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={finishedOrders}
        showReceived
        onCheck={undefined}
      />

      {selectedOrder ? (
        <CheckReceivingModal
          order={selectedOrder}
          receivedValues={receivedValues}
          remarkValues={remarkValues}
          checkModes={checkModes}
          formError={formError}
          saving={saving}
          onQtyReceivedChange={(itemCode, qtyReceived) => {
            setReceivedValues((current) => ({ ...current, [itemCode]: qtyReceived }));
            const item = selectedOrder.items.find((orderItem) => orderItem.itemCode === itemCode);
            setCheckModes((current) => ({
              ...current,
              [itemCode]: getReceivingCheckMode(qtyReceived, remarkValues[itemCode] ?? "", item?.qtyConfirm ?? 0),
            }));
          }}
          onRemarkChange={(itemCode, remark) => {
            setRemarkValues((current) => ({ ...current, [itemCode]: remark }));
            const item = selectedOrder.items.find((orderItem) => orderItem.itemCode === itemCode);
            setCheckModes((current) => ({
              ...current,
              [itemCode]: getReceivingCheckMode(receivedValues[itemCode] ?? "", remark, item?.qtyConfirm ?? 0),
            }));
          }}
          onMarkMatch={(itemCode, qtyConfirm) => {
            setReceivedValues((current) => ({ ...current, [itemCode]: String(qtyConfirm) }));
            setRemarkValues((current) => ({ ...current, [itemCode]: "sesuai" }));
            setCheckModes((current) => ({ ...current, [itemCode]: "match" }));
          }}
          onMarkReject={(itemCode) => {
            setReceivedValues((current) => ({ ...current, [itemCode]: "" }));
            setRemarkValues((current) => ({ ...current, [itemCode]: "" }));
            setCheckModes((current) => ({ ...current, [itemCode]: "reject" }));
          }}
          onClose={closeCheckModal}
          onSubmit={handleCheckSubmit}
        />
      ) : null}

      {toastMessage ? (
        <div className="fixed right-4 bottom-4 z-[100] max-w-sm">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-lg">
            <p className="text-sm font-semibold">Berhasil</p>
            <p className="mt-1 text-sm">{toastMessage}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QueueTable({
  title,
  description,
  rows,
  showReceived,
  onCheck,
}: {
  title: string;
  description: string;
  rows: ReceivingQueueRow[];
  showReceived: boolean;
  onCheck?: ((order: ReceivingQueueRow) => void) | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          Tidak ada data yang bisa ditampilkan pada section ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                {baseColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                {metricColumns.map((column) => (
                  <th
                    key={`${column.key}-request`}
                    className="border-b border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap"
                  >
                    {column.requestLabel}
                  </th>
                ))}
                {metricColumns.map((column) => (
                  <th
                    key={`${column.key}-delivery`}
                    className="border-b border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap"
                  >
                    {column.deliveryLabel}
                  </th>
                ))}
                {showReceived
                  ? metricColumns.map((column) => (
                      <th
                        key={`${column.key}-received`}
                        className="border-b border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap"
                      >
                        {column.receivedLabel}
                      </th>
                    ))
                  : null}
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Remarks Delivery
                </th>
                {onCheck ? (
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold whitespace-nowrap">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.orderId} className="align-top odd:bg-white even:bg-slate-50/60">
                  <TextCell value={row.kodeOrder} strong />
                  <TextCell value={row.tanggalOrder} />
                  <TextCell value={row.shift} />
                  <TextCell value={row.dayNight} />
                  <TextCell value={row.truckType} />
                  <NumericCell value={row.ritaseRequest} />
                  {metricColumns.map((column) => (
                    <NumericCell
                      key={`${row.orderId}-${column.key}-request`}
                      value={getRequestQty(row, column.key)}
                    />
                  ))}
                  {metricColumns.map((column) => (
                    <NumericCell
                      key={`${row.orderId}-${column.key}-delivery`}
                      value={row[column.key].delivery}
                    />
                  ))}
                  {showReceived
                    ? metricColumns.map((column) => (
                        <NumericCell
                          key={`${row.orderId}-${column.key}-received`}
                          value={row[column.key].received ?? 0}
                        />
                      ))
                    : null}
                  <RemarksCell value={row.remarksDelivery} />
                  {onCheck ? (
                    <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onCheck(row)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                      >
                        Check
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CheckReceivingModal({
  order,
  receivedValues,
  remarkValues,
  checkModes,
  formError,
  saving,
  onQtyReceivedChange,
  onRemarkChange,
  onMarkMatch,
  onMarkReject,
  onClose,
  onSubmit,
}: {
  order: ReceivingQueueRow;
  receivedValues: Record<string, string>;
  remarkValues: Record<string, string>;
  checkModes: Record<string, ReceivingCheckMode>;
  formError: string;
  saving: boolean;
  onQtyReceivedChange: (itemCode: string, qtyReceived: string) => void;
  onRemarkChange: (itemCode: string, remark: string) => void;
  onMarkMatch: (itemCode: string, qtyConfirm: number) => void;
  onMarkReject: (itemCode: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Receiving Check
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Check Receiving Order</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Tutup
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetaField label="Tanggal" value={order.tanggalOrder} />
            <MetaField label="Kode Order" value={order.kodeOrder} />
            <MetaField label="Shift" value={order.shift} />
            <MetaField label="Day / Night" value={order.dayNight} />
            <MetaField label="Truck Type" value={order.truckType} />
            <MetaField label="Ritase" value={formatNumber(order.ritaseRequest)} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100/90 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Code</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                    {order.truckType === "GAP" ? "Qty Gap" : "Qty Order"}
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Confirm</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold">Check</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Received</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.detailId} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">{item.itemCode}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-700">{item.itemName}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                      {formatNumber(order.truckType === "GAP" ? item.gapRequestQty : item.qtyOrder)}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                      {formatNumber(item.qtyConfirm)}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onMarkMatch(item.itemCode, item.qtyConfirm)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                            checkModes[item.itemCode] === "match"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          aria-label={`Tandai ${item.itemCode} sesuai`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkReject(item.itemCode)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                            checkModes[item.itemCode] === "reject"
                              ? "border-rose-600 bg-rose-600 text-white"
                              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                          aria-label={`Tandai ${item.itemCode} tidak sesuai`}
                        >
                          X
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={receivedValues[item.itemCode] ?? ""}
                        onChange={(event) => onQtyReceivedChange(item.itemCode, event.target.value)}
                        className="ml-auto block h-11 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm text-slate-700 outline-none transition focus:border-sky-500"
                      />
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3">
                      <input
                        type="text"
                        value={remarkValues[item.itemCode] ?? ""}
                        onChange={(event) => onRemarkChange(item.itemCode, event.target.value)}
                        className="block h-11 w-full min-w-32 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Check Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const baseColumns: Array<{ key: keyof ReceivingQueueRow; label: string; align?: "left" | "right" }> = [
  { key: "kodeOrder", label: "Kode Order" },
  { key: "tanggalOrder", label: "Tanggal Order" },
  { key: "shift", label: "Shift" },
  { key: "dayNight", label: "Day / Night" },
  { key: "truckType", label: "Truck Type" },
  { key: "ritaseRequest", label: "Ritase", align: "right" },
];

const metricColumns: Array<{
  key: ReceivingMetricKey;
  requestLabel: string;
  deliveryLabel: string;
  receivedLabel: string;
}> = [
  { key: "cb1tr", requestLabel: "Req CB 1TR", deliveryLabel: "Delv CB 1TR", receivedLabel: "Recv CB 1TR" },
  { key: "cb2tr", requestLabel: "Req CB 2TR", deliveryLabel: "Delv CB 2TR", receivedLabel: "Recv CB 2TR" },
  { key: "camNo01", requestLabel: "Req CA 01", deliveryLabel: "Delv CA 01", receivedLabel: "Recv CA 01" },
  { key: "camNo02", requestLabel: "Req CA 02", deliveryLabel: "Delv CA 02", receivedLabel: "Recv CA 02" },
  { key: "cr1tr", requestLabel: "Req CR 1TR", deliveryLabel: "Delv CR 1TR", receivedLabel: "Recv CR 1TR" },
];

function getRequestQty(row: ReceivingQueueRow, key: ReceivingMetricKey) {
  return row.truckType === "GAP" ? row[key].gapRequest ?? 0 : row[key].order;
}

function SummaryCard({
  label,
  totalConfirmed,
  totalReceived,
  gap,
}: {
  label: string;
  totalConfirmed: number;
  totalReceived: number;
  gap: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-4 space-y-3">
        <MetricRow label="Total Confirm" value={totalConfirmed} />
        <MetricRow label="Total Received" value={totalReceived} />
        <MetricRow
          label="Gap"
          value={gap}
          valueClassName={gap < 0 ? "text-rose-600" : "text-emerald-600"}
        />
      </div>
    </article>
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

function TextCell({ value, strong }: { value: string; strong?: boolean }) {
  return (
    <td
      className={`border-b border-slate-200 px-4 py-3 text-slate-700 ${
        strong ? "whitespace-nowrap font-medium text-slate-900" : ""
      }`}
    >
      {value}
    </td>
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

function getReceivingCheckMode(
  qtyReceived: string,
  remarksDelivery: string,
  qtyConfirm: number
): ReceivingCheckMode {
  const parsedQty = Number(qtyReceived);
  const normalizedRemark = remarksDelivery.trim().toLowerCase();

  if (Number.isFinite(parsedQty) && parsedQty === qtyConfirm && normalizedRemark === "sesuai") {
    return "match";
  }

  if (qtyReceived.trim() !== "" || remarksDelivery.trim() !== "") {
    return "reject";
  }

  return "neutral";
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
