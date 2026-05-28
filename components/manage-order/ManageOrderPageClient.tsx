"use client";

import type { OrderingFilter, OrderingFilterOptions, OrderItemSummary, OrderReportRow } from "@/lib/order-report";
import JunbikiOrderForm from "@/components/ordering/JunbikiOrderForm";
import { RequestGapForm } from "@/components/ordering/OrderingReport";
import PalletOrderForm from "@/components/ordering/PalletOrderForm";
import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ManageOrderPageClientProps = {
  rows: OrderReportRow[];
  summaries: OrderItemSummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  selectedStatus: string;
  selectedTruckType: string;
  errorMessage?: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type EditablePalletOrder = {
  orderId: string;
  truckType: "PALLET";
  kodeOrder: string;
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: Array<{ itemCode: string; qtyOrder: number }>;
};

type EditableGapOrder = {
  orderId: string;
  truckType: "GAP";
  kodeOrder: string;
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: Array<{ itemCode: string; gapRequestQty: number }>;
};

type EditableJunbikiOrder = {
  orderId: string;
  truckType: "JUNBIKI";
  kodeOrder: string;
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  ratioCb1tr: number;
  ratioCb2tr: number;
  remarksOrdering: string;
  selectedShells: Array<{
    code: string;
    section: "CB_1TR" | "CB_2TR";
    status: "active" | "blocked";
    groupNumber: number;
  }>;
};

type EditableOrder = EditablePalletOrder | EditableJunbikiOrder | EditableGapOrder;
type ActiveTab = "order" | "delivery" | "receiving";
type GapItemCode = "CB_1TR" | "CB_2TR" | "CAM_01" | "CAM_02" | "CR_1TR";
type ShellStatus = "idle" | "active" | "blocked";
type ShellSectionKey = "CB_1TR" | "CB_2TR";
type ShellStatusMap = Record<string, ShellStatus>;
type ReceivingCheckMode = "match" | "reject" | "neutral";
type ManageMetricKey = "cb1tr" | "cb2tr" | "camNo01" | "camNo02" | "cr1tr";

type ShellItem = {
  code: string;
  groupNumber: number;
  section: ShellSectionKey;
};

const SHELL_SECTIONS: Record<ShellSectionKey, ShellItem[]> = {
  CB_1TR: buildShellItems("CB_1TR", 1, 3),
  CB_2TR: buildShellItems("CB_2TR", 4, 12),
};
const ALL_SHELLS = [...SHELL_SECTIONS.CB_1TR, ...SHELL_SECTIONS.CB_2TR];
const EMPTY_SHELL_STATUSES = ALL_SHELLS.reduce<ShellStatusMap>((accumulator, shell) => {
  accumulator[shell.code] = "idle";
  return accumulator;
}, {});
const GAP_ITEM_LABELS: Record<GapItemCode, string> = {
  CB_1TR: "Cylinder Block 1TR",
  CB_2TR: "Cylinder Block 2TR",
  CAM_01: "Camshaft No. 01",
  CAM_02: "Camshaft No. 02",
  CR_1TR: "Crankshaft 1TR",
};

export default function ManageOrderPageClient({
  rows,
  selectedFilter,
  filterOptions,
  selectedStatus,
  selectedTruckType,
  errorMessage,
}: ManageOrderPageClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrderReportRow | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<OrderReportRow | null>(null);
  const [editableOrder, setEditableOrder] = useState<EditableOrder | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("order");
  const [toast, setToast] = useState<ToastState>(null);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const statusMatches = selectedStatus === "ALL" || row.statusOrder.toLowerCase() === selectedStatus.toLowerCase();
      const truckMatches = selectedTruckType === "ALL" || row.truckType.toLowerCase() === selectedTruckType.toLowerCase();
      return statusMatches && truckMatches;
    });
  }, [rows, selectedStatus, selectedTruckType]);

  async function handleEdit(order: OrderReportRow) {
    try {
      setLoadingEditId(order.orderId);
      const res = await fetch(`/api/ordering/${order.orderId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengambil detail order");
      }

      setSelectedRow(order);
      setEditableOrder(data);
      setActiveTab("order");
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoadingEditId(null);
    }
  }

  async function handleDelete(orderId: string) {
    try {
      setDeletingId(orderId);
      const res = await fetch(`/api/ordering/${orderId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menghapus order");
      }

      setToast({ type: "success", message: "Order berhasil dihapus" });
      router.refresh();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setDeletingId(null);
    }
  }

  function closeEditModal() {
    setSelectedRow(null);
    setEditableOrder(null);
    setActiveTab("order");
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Manage Order</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Kelola Order</h1>
            <p className="mt-2 text-sm text-slate-600">
              Fitur khusus admin untuk edit data ordering, delivery, dan receiving dalam satu modal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <AutoSubmitReportFilters selectedFilter={selectedFilter} filterOptions={filterOptions} className="contents" />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <ManageOrderTable
        rows={filteredRows}
        deletingId={deletingId}
        pendingDeleteId={pendingDelete?.orderId ?? null}
        loadingEditId={loadingEditId}
        onEdit={handleEdit}
        onRequestDelete={setPendingDelete}
      />

      {selectedRow && editableOrder ? (
        <ManageOrderEditModal
          row={selectedRow}
          editableOrder={editableOrder}
          selectedFilter={selectedFilter}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          onClose={closeEditModal}
          onSaved={(message) => {
            setToast({ type: "success", message });
            router.refresh();
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteModal
          order={pendingDelete}
          deleting={deletingId === pendingDelete.orderId}
          onClose={() => (deletingId ? null : setPendingDelete(null))}
          onConfirm={async () => {
            await handleDelete(pendingDelete.orderId);
            setPendingDelete(null);
          }}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
    </section>
  );
}

function ManageOrderEditModal({
  row,
  editableOrder,
  selectedFilter,
  activeTab,
  onActiveTabChange,
  onClose,
  onSaved,
  onError,
}: {
  row: OrderReportRow;
  editableOrder: EditableOrder;
  selectedFilter: OrderingFilter;
  activeTab: ActiveTab;
  onActiveTabChange: (tab: ActiveTab) => void;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const status = row.statusOrder.toLowerCase();
  const receivingEnabled = status === "confirmed" || status === "checked";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-[94vw] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Manage Order</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>

          <div>
            <h2 className="-mt-3 text-2xl font-bold text-slate-900">{row.code}</h2>
          </div>

          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-600">
              {row.date} / Shift {row.shift} / {row.dayNight || "-"} / {row.truckType}
            </p>
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "order"} onClick={() => onActiveTabChange("order")} label="Order" />
              <TabButton active={activeTab === "delivery"} onClick={() => onActiveTabChange("delivery")} label="Delivery" />
              <TabButton
                active={activeTab === "receiving"}
                disabled={!receivingEnabled}
                onClick={() => onActiveTabChange("receiving")}
                label="Receiving"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {activeTab === "order" ? (
            <OrderTabForm
              editableOrder={editableOrder}
              selectedFilter={selectedFilter}
              onCancel={onClose}
              onSaved={(kodeOrder) => onSaved(`Order ${kodeOrder} berhasil disimpan`)}
            />
          ) : null}
          {activeTab === "delivery" ? (
            <DeliveryTabForm row={row} onSaved={() => onSaved(`Delivery ${row.code} berhasil disimpan`)} onError={onError} />
          ) : null}
          {activeTab === "receiving" && receivingEnabled ? (
            <ReceivingTabForm row={row} onSaved={() => onSaved(`Receiving ${row.code} berhasil disimpan`)} onError={onError} />
          ) : null}
          {activeTab === "receiving" && !receivingEnabled ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              Receiving hanya bisa diedit untuk order dengan status Confirmed atau Checked.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderTabForm({
  editableOrder,
  selectedFilter,
  onCancel,
  onSaved,
}: {
  editableOrder: EditableOrder;
  selectedFilter: OrderingFilter;
  onCancel: () => void;
  onSaved: (kodeOrder: string) => void;
}) {
  if (editableOrder.truckType === "JUNBIKI") {
    return (
      <JunbikiOrderForm
        orderId={editableOrder.orderId}
        initialKodeOrder={editableOrder.kodeOrder}
        initialValues={{
          tanggal_order: editableOrder.tanggalOrder,
          shift: editableOrder.shift as "RED" | "WHITE",
          day_night: editableOrder.dayNight as "DAY" | "NIGHT",
          ritase: editableOrder.ritaseRequest,
          ratio_cb_1tr: editableOrder.ratioCb1tr,
          ratio_cb_2tr: editableOrder.ratioCb2tr,
          remark: editableOrder.remarksOrdering,
          selected_shells: editableOrder.selectedShells,
        }}
        hideHeaderTitle
        onSuccess={onSaved}
      />
    );
  }

  if (editableOrder.truckType === "PALLET") {
    return (
      <PalletOrderForm
        embedded
        orderId={editableOrder.orderId}
        initialKodeOrder={editableOrder.kodeOrder}
        ritaseProgressDate={editableOrder.tanggalOrder}
        initialValues={{
          tanggalOrder: editableOrder.tanggalOrder,
          shift: editableOrder.shift,
          dayNight: editableOrder.dayNight,
          ritaseRequest: editableOrder.ritaseRequest,
          remarksOrdering: editableOrder.remarksOrdering,
          items: {
            CR_1TR: editableOrder.items.find((item) => item.itemCode === "CR_1TR")?.qtyOrder ?? 0,
            CAM_01: editableOrder.items.find((item) => item.itemCode === "CAM_01")?.qtyOrder ?? 0,
            CAM_02: editableOrder.items.find((item) => item.itemCode === "CAM_02")?.qtyOrder ?? 0,
            CB_1TR: editableOrder.items.find((item) => item.itemCode === "CB_1TR")?.qtyOrder ?? 0,
            CB_2TR: editableOrder.items.find((item) => item.itemCode === "CB_2TR")?.qtyOrder ?? 0,
          },
        }}
        onSuccess={onSaved}
      />
    );
  }

  return (
    <RequestGapForm
      orderId={editableOrder.orderId}
      initialKodeOrder={editableOrder.kodeOrder}
      selectedDate={editableOrder.tanggalOrder || selectedFilter.date}
      initialValues={{
        tanggalOrder: editableOrder.tanggalOrder,
        shift: editableOrder.shift,
        dayNight: editableOrder.dayNight,
        ritaseRequest: editableOrder.ritaseRequest,
        remarksOrdering: editableOrder.remarksOrdering,
        items: editableOrder.items.map((item) => ({
          itemCode: item.itemCode as GapItemCode,
          label: GAP_ITEM_LABELS[item.itemCode as GapItemCode] ?? item.itemCode,
          currentGap: 0,
          gapRequestQty: item.gapRequestQty,
        })),
      }}
      onCancel={onCancel}
      onSuccess={onSaved}
    />
  );
}

function DeliveryTabForm({
  row,
  onSaved,
  onError,
}: {
  row: OrderReportRow;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [deliveryNote, setDeliveryNote] = useState(row.deliveryNote === "-" ? "" : row.deliveryNote);
  const [remarksDelivery, setRemarksDelivery] = useState(row.remarksDelivery === "-" ? "" : row.remarksDelivery);
  const [confirmValues, setConfirmValues] = useState<Record<string, string>>(
    Object.fromEntries(row.details.map((item) => [item.itemCode, formatInitialQuantityInput(item.qtyConfirm)]))
  );
  const [shellStatuses, setShellStatuses] = useState<ShellStatusMap>(() => buildInitialShellStatuses(row));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setDeliveryNote(row.deliveryNote === "-" ? "" : row.deliveryNote);
    setRemarksDelivery(row.remarksDelivery === "-" ? "" : row.remarksDelivery);
    setConfirmValues(Object.fromEntries(row.details.map((item) => [item.itemCode, formatInitialQuantityInput(item.qtyConfirm)])));
    setShellStatuses(buildInitialShellStatuses(row));
    setFormError("");
  }, [row]);

  async function handleSubmit() {
    if (!deliveryNote.trim()) {
      setFormError("Delivery Note wajib diisi");
      return;
    }

    if (!remarksDelivery.trim()) {
      setFormError("Remarks delivery wajib diisi");
      return;
    }

    const invalidItem = row.details.find((item) => {
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
      const res = await fetch(`/api/delivery/${row.orderId}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryNote,
          remarksDelivery,
          items: row.details.map((item) => ({
            itemCode: item.itemCode,
            qtyConfirm: Number(confirmValues[item.itemCode] ?? "") || 0,
          })),
          selected_shells:
            row.truckType === "JUNBIKI"
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
        throw new Error(data.error ?? "Gagal menyimpan delivery order");
      }

      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      setFormError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <MetaGrid row={row} />
      {row.truckType === "JUNBIKI" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.65fr)]">
          <ShellGridSection
            section="CB_1TR"
            shells={SHELL_SECTIONS.CB_1TR}
            shellStatuses={shellStatuses}
            onToggleShell={(shell) =>
              setShellStatuses((current) => ({ ...current, [shell.code]: getNextShellStatus(current[shell.code] ?? "idle") }))
            }
          />
          <ShellGridSection
            section="CB_2TR"
            shells={SHELL_SECTIONS.CB_2TR}
            shellStatuses={shellStatuses}
            onToggleShell={(shell) =>
              setShellStatuses((current) => ({ ...current, [shell.code]: getNextShellStatus(current[shell.code] ?? "idle") }))
            }
          />
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100/90 text-slate-700">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Code</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Name</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">{row.truckType === "GAP" ? "Qty Gap" : "Qty Order"}</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Confirm</th>
            </tr>
          </thead>
          <tbody>
            {row.details.map((item) => (
              <tr key={item.detailId} className="odd:bg-white even:bg-slate-50/60">
                <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">{item.itemCode}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-slate-700">{item.itemName}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                  {formatNumber(row.truckType === "GAP" ? item.gapRequestQty : item.qtyOrder)}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={confirmValues[item.itemCode] ?? ""}
                    onFocus={(event) => {
                      if (event.currentTarget.value === "0") {
                        event.currentTarget.select();
                      }
                    }}
                    onChange={(event) => setConfirmValues((current) => ({ ...current, [item.itemCode]: normalizeQuantityInput(event.target.value) }))}
                    className="ml-auto block h-11 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm text-slate-700 outline-none transition focus:border-sky-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Delivery Note (DN)">
          <input
            type="text"
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
          />
        </Field>
        <Field label="Remarks Delivery">
          <textarea
            value={remarksDelivery}
            onChange={(event) => setRemarksDelivery(event.target.value)}
            className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500"
          />
        </Field>
      </div>
      <FormFooter error={formError} saving={saving} submitLabel="Simpan Delivery" onSubmit={handleSubmit} />
    </div>
  );
}

function ReceivingTabForm({
  row,
  onSaved,
  onError,
}: {
  row: OrderReportRow;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [receivedValues, setReceivedValues] = useState<Record<string, string>>(
    Object.fromEntries(row.details.map((item) => [item.itemCode, String(item.qtyReceived ?? 0)]))
  );
  const [remarkValues, setRemarkValues] = useState<Record<string, string>>(
    Object.fromEntries(row.details.map((item) => [item.itemCode, item.remarksDelivery]))
  );
  const [checkModes, setCheckModes] = useState<Record<string, ReceivingCheckMode>>(
    Object.fromEntries(
      row.details.map((item) => [
        item.itemCode,
        getReceivingCheckMode(String(item.qtyReceived ?? 0), item.remarksDelivery, item.qtyConfirm),
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setReceivedValues(Object.fromEntries(row.details.map((item) => [item.itemCode, String(item.qtyReceived ?? 0)])));
    setRemarkValues(Object.fromEntries(row.details.map((item) => [item.itemCode, item.remarksDelivery])));
    setCheckModes(
      Object.fromEntries(
        row.details.map((item) => [
          item.itemCode,
          getReceivingCheckMode(String(item.qtyReceived ?? 0), item.remarksDelivery, item.qtyConfirm),
        ])
      )
    );
    setFormError("");
  }, [row]);

  async function handleSubmit() {
    const invalidItem = row.details.find((item) => {
      const rawValue = receivedValues[item.itemCode] ?? "";
      const value = rawValue.trim() === "" ? 0 : Number(rawValue);
      return !Number.isFinite(value) || value < 0;
    });

    if (invalidItem) {
      setFormError(`Qty received pada ${invalidItem.itemCode} tidak valid`);
      return;
    }

    const incompleteItem = row.details.find((item) => {
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
      const res = await fetch(`/api/receiving/${row.orderId}/check`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: row.details.map((item) => ({
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

      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      setFormError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <MetaGrid row={row} />
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100/90 text-slate-700">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Code</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item Name</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">{row.truckType === "GAP" ? "Qty Gap" : "Qty Order"}</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Confirm</th>
              <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold">Check</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Received</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {row.details.map((item) => (
              <tr key={item.detailId} className="odd:bg-white even:bg-slate-50/60">
                <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">{item.itemCode}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-slate-700">{item.itemName}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                  {formatNumber(row.truckType === "GAP" ? item.gapRequestQty : item.qtyOrder)}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">{formatNumber(item.qtyConfirm)}</td>
                <td className="border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedValues((current) => ({ ...current, [item.itemCode]: String(item.qtyConfirm) }));
                        setRemarkValues((current) => ({ ...current, [item.itemCode]: "sesuai" }));
                        setCheckModes((current) => ({ ...current, [item.itemCode]: "match" }));
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                        checkModes[item.itemCode] === "match"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceivedValues((current) => ({ ...current, [item.itemCode]: "" }));
                        setRemarkValues((current) => ({ ...current, [item.itemCode]: "" }));
                        setCheckModes((current) => ({ ...current, [item.itemCode]: "reject" }));
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
                        checkModes[item.itemCode] === "reject"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
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
                    onChange={(event) => {
                      const qtyReceived = event.target.value;
                      setReceivedValues((current) => ({ ...current, [item.itemCode]: qtyReceived }));
                      setCheckModes((current) => ({
                        ...current,
                        [item.itemCode]: getReceivingCheckMode(qtyReceived, remarkValues[item.itemCode] ?? "", item.qtyConfirm),
                      }));
                    }}
                    className="ml-auto block h-11 w-28 rounded-xl border border-slate-300 px-3 text-right text-sm text-slate-700 outline-none transition focus:border-sky-500"
                  />
                </td>
                <td className="border-b border-slate-200 px-4 py-3">
                  <input
                    type="text"
                    value={remarkValues[item.itemCode] ?? ""}
                    onChange={(event) => {
                      const remark = event.target.value;
                      setRemarkValues((current) => ({ ...current, [item.itemCode]: remark }));
                      setCheckModes((current) => ({
                        ...current,
                        [item.itemCode]: getReceivingCheckMode(receivedValues[item.itemCode] ?? "", remark, item.qtyConfirm),
                      }));
                    }}
                    className="block h-11 w-full min-w-32 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormFooter error={formError} saving={saving} submitLabel="Simpan Receiving" onSubmit={handleSubmit} />
    </div>
  );
}

function ManageOrderTable({
  rows,
  deletingId,
  pendingDeleteId,
  loadingEditId,
  onEdit,
  onRequestDelete,
}: {
  rows: OrderReportRow[];
  deletingId: string | null;
  pendingDeleteId: string | null;
  loadingEditId: string | null;
  onEdit: (row: OrderReportRow) => void;
  onRequestDelete: (row: OrderReportRow | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Order List</h2>
        <p className="mt-1 text-sm text-slate-600">Daftar order pada filter aktif.</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada order pada filter ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="text-slate-700">
              <tr>
                {buildManageOrderColumnGroups().map((group) => (
                  <th
                    key={group.key}
                    colSpan={group.colSpan}
                    className={`border-b border-r border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap ${group.className}`}
                  >
                    {group.label}
                  </th>
                ))}
              </tr>
              <tr>
                {["Kode", "Tanggal", "Waktu", "Shift", "Day/Night", "Truck Type", "Ritase", "Status"].map((label) => (
                  <th
                    key={label}
                    className="border-b border-r border-slate-200 bg-white px-4 py-3 text-left font-semibold whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
                {MANAGE_METRIC_COLUMNS.flatMap((column) => [
                  <th
                    key={`${column.key}-request`}
                    className={`border-b border-r border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap ${getManageGroupCellClassName(column.key)}`}
                  >
                    Request
                  </th>,
                  <th
                    key={`${column.key}-delivery`}
                    className={`border-b border-r border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap ${getManageGroupCellClassName(column.key)}`}
                  >
                    Delivery
                  </th>,
                  <th
                    key={`${column.key}-receiving`}
                    className={`border-b border-r border-slate-200 px-4 py-3 text-right font-semibold whitespace-nowrap ${getManageGroupCellClassName(column.key)}`}
                  >
                    Receiving
                  </th>,
                ])}
                <th className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Ordering
                </th>
                <th className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Delivery
                </th>
                <th className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Receiving
                </th>
                <th className="border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const canDelete = row.statusOrder.toLowerCase() === "submitted";
                return (
                  <tr key={row.orderId} className="align-top">
                    <TextCell value={row.code} strong />
                    <TextCell value={row.date} />
                    <TextCell value={row.time} />
                    <TextCell value={row.shift} />
                    <TextCell value={row.dayNight || "-"} />
                    <TextCell value={row.truckType} />
                    <NumberCell value={row.ritaseRequest} />
                    <td className="border-b border-r border-slate-200 px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={row.statusOrder} />
                    </td>
                    {MANAGE_METRIC_COLUMNS.flatMap((column) => [
                      <NumberCell
                        key={`${row.orderId}-${column.key}-request`}
                        value={getOrderRequestQty(row, column.key)}
                        group={column.key}
                      />,
                      <NumberCell
                        key={`${row.orderId}-${column.key}-delivery`}
                        value={row[column.key].delivery}
                        group={column.key}
                      />,
                      <NumberCell
                        key={`${row.orderId}-${column.key}-receiving`}
                        value={row[column.key].received ?? 0}
                        group={column.key}
                      />,
                    ])}
                    <RemarksCell value={row.remarksOrdering} />
                    <RemarksCell value={row.remarksDelivery} />
                    <RemarksCell value={row.remarksReceiving} />
                    <td className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          disabled={loadingEditId === row.orderId || deletingId === row.orderId}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loadingEditId === row.orderId ? "Membuka..." : "Edit"}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => onRequestDelete(row)}
                            disabled={deletingId === row.orderId}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === row.orderId || pendingDeleteId === row.orderId ? "Delete" : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, disabled, label, onClick }: { active: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function MetaGrid({ row }: { row: OrderReportRow }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetaField label="Tanggal" value={row.date} />
      <MetaField label="Kode Order" value={row.code} />
      <MetaField label="Shift" value={row.shift} />
      <MetaField label="Day / Night" value={row.dayNight || "-"} />
      <MetaField label="Truck Type" value={row.truckType} />
      <MetaField label="Ritase" value={formatNumber(row.ritaseRequest)} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function FormFooter({ error, saving, submitLabel, onSubmit }: { error: string; saving: boolean; submitLabel: string; onSubmit: () => void }) {
  return (
    <>
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="flex justify-end border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </>
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
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{section === "CB_1TR" ? "Shell CB 1TR" : "Shell CB 2TR"}</h3>
      <div className="mt-5 space-y-4">
        {groupShellsByLetter(shells).map((row) => (
          <div key={row.key}>
            <div className={`grid gap-3 ${section === "CB_1TR" ? "grid-cols-3" : "grid-cols-3 lg:grid-cols-5 xl:grid-cols-9"}`}>
              {row.items.map((shell) => (
                <button
                  key={shell.code}
                  type="button"
                  onClick={() => onToggleShell(shell)}
                  className={`rounded-2xl border px-3 py-4 text-center text-sm font-semibold shadow-sm transition ${getShellStatusClassName(shellStatuses[shell.code] ?? "idle")}`}
                >
                  <span className="block text-base font-bold">{shell.code}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-600">Idle</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">Active / OK</span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">Blocked / Reject</span>
      </div>
    </section>
  );
}

function TextCell({ value, strong = false }: { value: string; strong?: boolean }) {
  return (
    <td className={`border-b border-r border-slate-200 px-4 py-3 text-slate-700 whitespace-nowrap ${strong ? "font-semibold text-slate-900" : ""}`}>
      {value}
    </td>
  );
}

function NumberCell({ value, group }: { value: number; group?: ManageMetricKey }) {
  return (
    <td
      className={`border-b border-r border-slate-200 px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap ${
        group ? getManageGroupCellClassName(group) : "bg-white"
      }`}
    >
      {formatNumber(value)}
    </td>
  );
}

function RemarksCell({ value }: { value: string }) {
  return (
    <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-700">
      <div className="min-w-[180px] whitespace-pre-wrap break-words">{value && value !== "-" ? value : "-"}</div>
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "checked"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "confirmed"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : normalized === "submitted"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{status}</span>;
}

function ConfirmDeleteModal({ order, deleting, onClose, onConfirm }: { order: OrderReportRow; deleting: boolean; onClose: () => void; onConfirm: () => void | Promise<void> }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Delete Order</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">Hapus order ini?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Order <span className="font-semibold text-slate-900">{order.code}</span> akan dihapus permanen. Aksi ini hanya tersedia untuk status Submitted.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={deleting} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            Batal
          </button>
          <button type="button" onClick={() => void onConfirm()} disabled={deleting} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
            {deleting ? "Menghapus..." : "Ya, hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: NonNullable<ToastState> }) {
  return (
    <div className="fixed right-4 bottom-4 z-[100] max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-lg ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
        <p className="text-sm font-semibold">{toast.type === "success" ? "Berhasil" : "Error"}</p>
        <p className="mt-1 text-sm">{toast.message}</p>
      </div>
    </div>
  );
}

function buildInitialShellStatuses(row: OrderReportRow): ShellStatusMap {
  const next = { ...EMPTY_SHELL_STATUSES };
  for (const shell of [...row.shellStateCb1tr, ...row.shellStateCb2tr]) {
    next[shell.code] = shell.status;
  }
  return next;
}

function buildShellItems(section: ShellSectionKey, startGroup: number, endGroup: number) {
  const variants = ["C", "B", "A"];
  const items: ShellItem[] = [];
  for (let groupNumber = startGroup; groupNumber <= endGroup; groupNumber += 1) {
    for (const variant of variants) {
      items.push({ code: `${groupNumber}${variant}`, groupNumber, section });
    }
  }
  return items;
}

function groupShellsByLetter(shells: ShellItem[]) {
  return [
    { key: "Row C", variant: "C" },
    { key: "Row B", variant: "B" },
    { key: "Row A", variant: "A" },
  ].map((row) => ({
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

function getReceivingCheckMode(qtyReceived: string, remarksDelivery: string, qtyConfirm: number): ReceivingCheckMode {
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

function getOrderRequestQty(row: OrderReportRow, key: OrderItemSummary["key"]) {
  return row.truckType === "GAP" ? row[key].gapRequest ?? 0 : row[key].order;
}

const MANAGE_METRIC_COLUMNS: Array<{ key: ManageMetricKey; label: string }> = [
  { key: "cb1tr", label: "CB 1TR" },
  { key: "cb2tr", label: "CB 2TR" },
  { key: "camNo01", label: "Cam 01" },
  { key: "camNo02", label: "Cam 02" },
  { key: "cr1tr", label: "CR 1TR" },
];

function buildManageOrderColumnGroups() {
  return [
    { key: "identity", label: "Informasi", colSpan: 8, className: "bg-slate-100 text-slate-700" },
    { key: "cb1tr", label: "CB 1TR", colSpan: 3, className: "bg-emerald-50 text-emerald-900" },
    { key: "cb2tr", label: "CB 2TR", colSpan: 3, className: "bg-sky-50 text-sky-900" },
    { key: "camNo01", label: "Cam 01", colSpan: 3, className: "bg-violet-50 text-violet-900" },
    { key: "camNo02", label: "Cam 02", colSpan: 3, className: "bg-rose-50 text-rose-900" },
    { key: "cr1tr", label: "CR 1TR", colSpan: 3, className: "bg-amber-50 text-amber-900" },
    { key: "remarks", label: "Remarks", colSpan: 3, className: "bg-slate-100 text-slate-700" },
    { key: "actions", label: "Action", colSpan: 1, className: "bg-slate-900 text-white" },
  ];
}

function getManageGroupCellClassName(group: ManageMetricKey) {
  const classes: Record<ManageMetricKey, string> = {
    cb1tr: "bg-emerald-50/40",
    cb2tr: "bg-sky-50/50",
    camNo01: "bg-violet-50/40",
    camNo02: "bg-rose-50/40",
    cr1tr: "bg-amber-50/50",
  };

  return classes[group];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function normalizeQuantityInput(value: string) {
  if (value.trim() === "") {
    return "";
  }

  const normalized = value.replace(/^0+(?=\d)/, "");
  return normalized || "0";
}

function formatInitialQuantityInput(value: number | null | undefined) {
  return value && value > 0 ? String(value) : "";
}
