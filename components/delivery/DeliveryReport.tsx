"use client";

import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import type {
  DeliveryQueueRow,
  DeliverySummary,
  DeliveryMetricKey,
  OrderingFilter,
  OrderingFilterOptions,
} from "@/lib/delivery-report";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ShellStatus = "idle" | "active" | "blocked";
type ShellSectionKey = "CB_1TR" | "CB_2TR";

type ShellItem = {
  code: string;
  groupNumber: number;
  section: ShellSectionKey;
};

type ShellStatusMap = Record<string, ShellStatus>;

const SHELL_SECTIONS: Record<ShellSectionKey, ShellItem[]> = {
  CB_1TR: buildShellItems("CB_1TR", 1, 3),
  CB_2TR: buildShellItems("CB_2TR", 4, 12),
};

const ALL_SHELLS = [...SHELL_SECTIONS.CB_1TR, ...SHELL_SECTIONS.CB_2TR];

const EMPTY_SHELL_STATUSES: ShellStatusMap = ALL_SHELLS.reduce<ShellStatusMap>((accumulator, shell) => {
  accumulator[shell.code] = "idle";
  return accumulator;
}, {});

type DeliveryReportProps = {
  activeOrders: DeliveryQueueRow[];
  finishedOrders: DeliveryQueueRow[];
  summary: DeliverySummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
};

export default function DeliveryReport({
  activeOrders,
  finishedOrders,
  summary,
  selectedFilter,
  filterOptions,
  errorMessage,
}: DeliveryReportProps) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<DeliveryQueueRow | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [remarksDelivery, setRemarksDelivery] = useState("");
  const [confirmValues, setConfirmValues] = useState<Record<string, string>>({});
  const [shellStatuses, setShellStatuses] = useState<ShellStatusMap>(EMPTY_SHELL_STATUSES);
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

  function openConfirmModal(order: DeliveryQueueRow) {
    setSelectedOrder(order);
    setDeliveryNote("");
    setRemarksDelivery("");
    setConfirmValues(
      Object.fromEntries(order.items.map((item) => [item.itemCode, ""]))
    );
    setShellStatuses(buildInitialShellStatuses(order));
    setFormError("");
  }

  function closeConfirmModal() {
    if (saving) {
      return;
    }

    setSelectedOrder(null);
    setDeliveryNote("");
    setRemarksDelivery("");
    setConfirmValues({});
    setShellStatuses(EMPTY_SHELL_STATUSES);
    setFormError("");
  }

  async function handleConfirmSubmit() {
    if (!selectedOrder) {
      return;
    }

    if (!deliveryNote.trim()) {
      setFormError("Delivery Note wajib diisi");
      return;
    }

    if (!remarksDelivery.trim()) {
      setFormError("Remarks delivery wajib diisi");
      return;
    }

    const invalidItem = selectedOrder.items.find((item) => {
      const rawValue = confirmValues[item.itemCode] ?? "";
      const value = rawValue.trim() === "" ? 0 : Number(rawValue);
      return !Number.isFinite(value) || value < 0;
    });

    if (invalidItem) {
      setFormError(`Qty confirm pada ${invalidItem.itemCode} tidak valid`);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const res = await fetch(`/api/delivery/${selectedOrder.orderId}/confirm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryNote,
          remarksDelivery,
          items: selectedOrder.items.map((item) => ({
            itemCode: item.itemCode,
            qtyConfirm: Number(confirmValues[item.itemCode] ?? "") || 0,
          })),
          selected_shells:
            selectedOrder.truckType === "JUNBIKI"
              ? ALL_SHELLS.map((shell) => ({
                  code: shell.code,
                  section: shell.section,
                  status: shellStatuses[shell.code] ?? "idle",
                  groupNumber: shell.groupNumber,
                }))
              : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengonfirmasi delivery order");
      }

      closeConfirmModal();
      setToastMessage(`Order ${selectedOrder.kodeOrder} berhasil dikonfirmasi`);
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Delivery Queue
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Summary Order</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor order masuk untuk delivery, termasuk queue aktif dan order yang sudah selesai.
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
            totalOrder={item.totalOrder}
            totalDelivery={item.totalDelivery}
            gap={item.gap}
          />
        ))}
      </div>

      <QueueTable
        title="Active Order"
        description={`Order dengan status Submitted untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={activeOrders}
        showDelivery={false}
        onConfirm={openConfirmModal}
      />

      <QueueTable
        title="Finish Order"
        description={`Order dengan status Confirmed / Checked untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={finishedOrders}
        showDelivery
        onConfirm={undefined}
      />

      {selectedOrder ? (
        <ConfirmDeliveryModal
          order={selectedOrder}
          deliveryNote={deliveryNote}
          remarksDelivery={remarksDelivery}
          confirmValues={confirmValues}
          formError={formError}
          saving={saving}
          shellStatuses={shellStatuses}
          onDeliveryNoteChange={setDeliveryNote}
          onRemarksDeliveryChange={setRemarksDelivery}
          onQtyConfirmChange={(itemCode, qtyConfirm) =>
            setConfirmValues((current) => ({ ...current, [itemCode]: qtyConfirm }))
          }
          onToggleShell={(shell) =>
            setShellStatuses((current) => ({
              ...current,
              [shell.code]: getNextShellStatus(current[shell.code] ?? "idle"),
            }))
          }
          onClose={closeConfirmModal}
          onSubmit={handleConfirmSubmit}
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
  showDelivery,
  onConfirm,
}: {
  title: string;
  description: string;
  rows: DeliveryQueueRow[];
  showDelivery: boolean;
  onConfirm?: ((order: DeliveryQueueRow) => void) | undefined;
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
                {showDelivery
                  ? metricColumns.map((column) => (
                      <th
                        key={`${column.key}-delivery`}
                        className="border-b border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap"
                      >
                        {column.deliveryLabel}
                      </th>
                    ))
                  : null}
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Remarks Ordering
                </th>
                {onConfirm ? (
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
                  {showDelivery
                    ? metricColumns.map((column) => (
                        <NumericCell
                          key={`${row.orderId}-${column.key}-delivery`}
                          value={row[column.key].delivery}
                        />
                      ))
                    : null}
                  <RemarksCell value={row.remarksOrdering} />
                  {onConfirm ? (
                    <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onConfirm(row)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                      >
                        Konfirmasi
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

function ConfirmDeliveryModal({
  order,
  deliveryNote,
  remarksDelivery,
  confirmValues,
  formError,
  saving,
  shellStatuses,
  onDeliveryNoteChange,
  onRemarksDeliveryChange,
  onQtyConfirmChange,
  onToggleShell,
  onClose,
  onSubmit,
}: {
  order: DeliveryQueueRow;
  deliveryNote: string;
  remarksDelivery: string;
  confirmValues: Record<string, string>;
  formError: string;
  saving: boolean;
  shellStatuses: ShellStatusMap;
  onDeliveryNoteChange: (value: string) => void;
  onRemarksDeliveryChange: (value: string) => void;
  onQtyConfirmChange: (itemCode: string, qtyConfirm: string) => void;
  onToggleShell: (shell: ShellItem) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-[88vw] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Delivery Confirmation
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Konfirmasi Order</h2>
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

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetaField label="Tanggal" value={order.tanggalOrder} />
            <MetaField label="Kode Order" value={order.kodeOrder} />
            <MetaField label="Shift" value={order.shift} />
            <MetaField label="Day / Night" value={order.dayNight} />
            <MetaField label="Truck Type" value={order.truckType} />
            <MetaField label="Ritase" value={formatNumber(order.ritaseRequest)} />
          </div>

          {order.truckType === "JUNBIKI" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.65fr)]">
              <ShellGridSection
                section="CB_1TR"
                shells={SHELL_SECTIONS.CB_1TR}
                shellStatuses={shellStatuses}
                onToggleShell={onToggleShell}
              />
              <ShellGridSection
                section="CB_2TR"
                shells={SHELL_SECTIONS.CB_2TR}
                shellStatuses={shellStatuses}
                onToggleShell={onToggleShell}
              />
            </div>
          ) : null}

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
                    <td className="border-b border-slate-200 px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={confirmValues[item.itemCode] ?? ""}
                        onChange={(event) => onQtyConfirmChange(item.itemCode, event.target.value)}
                        className="ml-auto block h-11 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm text-slate-700 outline-none transition focus:border-sky-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Note (DN)</label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(event) => onDeliveryNoteChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Remarks Delivery</label>
              <textarea
                value={remarksDelivery}
                onChange={(event) => onRemarksDeliveryChange(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500"
              />
            </div>
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
            {saving ? "Menyimpan..." : "Konfirmasi Order"}
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

function ShellGridSection({
  section,
  shells,
  shellStatuses,
  onToggleShell,
}: {
  section: ShellSectionKey;
  shells: ShellItem[];
  shellStatuses: ShellStatusMap;
  onToggleShell: (shell: ShellItem) => void;
}) {
  const groupedShells = groupShellsByLetter(shells);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-slate-900">{section === "CB_1TR" ? "Shell CB 1TR" : "Shell CB 2TR"}</h3>
      </div>

      <div className="mt-5 space-y-4">
        {groupedShells.map((row) => (
          <div key={row.key}>
            <div className={`grid gap-3 ${section === "CB_1TR" ? "grid-cols-3" : "grid-cols-3 lg:grid-cols-5 xl:grid-cols-9"}`}>
              {row.items.map((shell) => (
                <button
                  key={shell.code}
                  type="button"
                  onClick={() => onToggleShell(shell)}
                  className={`rounded-2xl border px-3 py-4 text-center text-sm font-semibold shadow-sm transition ${
                    getShellStatusClassName(shellStatuses[shell.code] ?? "idle")
                  }`}
                >
                  <span className="block text-base font-bold">{shell.code}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
        <LegendBadge label="Idle" className="border-slate-200 bg-slate-100 text-slate-600" />
        <LegendBadge label="Active / OK" className="border-emerald-200 bg-emerald-50 text-emerald-700" />
        <LegendBadge label="Blocked / Reject" className="border-rose-200 bg-rose-50 text-rose-700" />
      </div>
    </section>
  );
}

function LegendBadge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full border px-2.5 py-1 ${className}`}>{label}</span>;
}

const baseColumns: Array<{ key: keyof DeliveryQueueRow; label: string; align?: "left" | "right" }> = [
  { key: "kodeOrder", label: "Kode Order" },
  { key: "tanggalOrder", label: "Tanggal Order" },
  { key: "shift", label: "Shift" },
  { key: "dayNight", label: "Day / Night" },
  { key: "truckType", label: "Truck Type" },
  { key: "ritaseRequest", label: "Ritase", align: "right" },
];

const metricColumns: Array<{
  key: DeliveryMetricKey;
  requestLabel: string;
  deliveryLabel: string;
}> = [
  { key: "cb1tr", requestLabel: "Req CB 1TR", deliveryLabel: "Delv CB 1TR" },
  { key: "cb2tr", requestLabel: "Req CB 2TR", deliveryLabel: "Delv CB 2TR" },
  { key: "camNo01", requestLabel: "Req CA 01", deliveryLabel: "Delv CA 01" },
  { key: "camNo02", requestLabel: "Req CA 02", deliveryLabel: "Delv CA 02" },
  { key: "cr1tr", requestLabel: "Req CR 1TR", deliveryLabel: "Delv CR 1TR" },
];

function getRequestQty(row: DeliveryQueueRow, key: DeliveryMetricKey) {
  return row.truckType === "GAP" ? row[key].gapRequest ?? 0 : row[key].order;
}

function SummaryCard({
  label,
  totalOrder,
  totalDelivery,
  gap,
}: {
  label: string;
  totalOrder: number;
  totalDelivery: number;
  gap: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-4 space-y-3">
        <MetricRow label="Total Order" value={totalOrder} />
        <MetricRow label="Total Delivery" value={totalDelivery} />
        <MetricRow
          label="Gap"
          value={gap}
          valueClassName={gap < 0 ? "text-rose-600" : "text-emerald-600"}
        />
      </div>
    </article>
  );
}

function buildInitialShellStatuses(order: DeliveryQueueRow): ShellStatusMap {
  const next = { ...EMPTY_SHELL_STATUSES };

  for (const shell of [...order.shellStateCb1tr, ...order.shellStateCb2tr]) {
    next[shell.code] = shell.status;
  }

  return next;
}

function buildShellItems(section: ShellSectionKey, startGroup: number, endGroup: number) {
  const variants = ["C", "B", "A"];
  const items: ShellItem[] = [];

  for (let groupNumber = startGroup; groupNumber <= endGroup; groupNumber += 1) {
    for (const variant of variants) {
      items.push({
        code: `${groupNumber}${variant}`,
        groupNumber,
        section,
      });
    }
  }

  return items;
}

function groupShellsByLetter(shells: ShellItem[]) {
  const rows = [
    { key: "Row C", variant: "C" },
    { key: "Row B", variant: "B" },
    { key: "Row A", variant: "A" },
  ];

  return rows.map((row) => ({
    key: row.key,
    items: shells.filter((shell) => shell.code.endsWith(row.variant)),
  }));
}

function getNextShellStatus(currentStatus: ShellStatus): ShellStatus {
  if (currentStatus === "idle") {
    return "active";
  }

  if (currentStatus === "active") {
    return "blocked";
  }

  return "idle";
}

function getShellStatusClassName(status: ShellStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
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
