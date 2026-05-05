"use client";

import type {
  OrderItemSummary,
  OrderingFilter,
  OrderingFilterOptions,
  OrderReportRow,
} from "@/lib/order-report";
import JunbikiOrderForm from "@/components/ordering/JunbikiOrderForm";
import PalletOrderForm from "@/components/ordering/PalletOrderForm";
import AutoSubmitReportFilters from "@/components/shared/AutoSubmitReportFilters";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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

type EditablePalletOrder = {
  orderId: string;
  truckType: "PALLET";
  kodeOrder: string;
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: Array<{
    itemCode: string;
    qtyOrder: number;
  }>;
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
  items: Array<{
    itemCode: string;
    gapRequestQty: number;
  }>;
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

type GapItemCode = "CB_1TR" | "CB_2TR" | "CAM_01" | "CAM_02" | "CR_1TR";

type GapFormItem = {
  itemCode: GapItemCode;
  label: string;
  currentGap: number;
  gapRequestQty: number;
};

const tableColumns: Array<{
  key:
    | keyof OrderReportRow
    | "cb1trRequest"
    | "cb1trDelivery"
    | "cb2trRequest"
    | "cb2trDelivery"
    | "camNo01Request"
    | "camNo01Delivery"
    | "camNo02Request"
    | "camNo02Delivery"
    | "cr1trRequest"
    | "cr1trDelivery"
    | "actions";
  label: string;
  align?: "left" | "right";
}> = [
  { key: "date", label: "Tanggal" },
  { key: "time", label: "Waktu Order" },
  { key: "code", label: "Kode" },
  { key: "truckType", label: "Truck Type" },
  { key: "ritaseRequest", label: "Ritase", align: "right" },
  { key: "cb1trRequest", label: "Req CB 1TR", align: "right" },
  { key: "cb1trDelivery", label: "Delv CB 1TR", align: "right" },
  { key: "cb2trRequest", label: "Req CB 2TR", align: "right" },
  { key: "cb2trDelivery", label: "Delv CB 2TR", align: "right" },
  { key: "camNo01Request", label: "Req CA 01", align: "right" },
  { key: "camNo01Delivery", label: "Delv CA 01", align: "right" },
  { key: "camNo02Request", label: "Req CA 02", align: "right" },
  { key: "camNo02Delivery", label: "Delv CA 02", align: "right" },
  { key: "cr1trRequest", label: "Req CR 1TR", align: "right" },
  { key: "cr1trDelivery", label: "Delv CR 1TR", align: "right" },
  { key: "remarksJunbikiS2", label: "Remarks Junbiki S2" },
  { key: "remarksPalletS2", label: "Remarks Pallet S2" },
  { key: "remarksGapS2", label: "Remarks Gap S2" },
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
  const [pendingDelete, setPendingDelete] = useState<OrderReportRow | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [editableOrder, setEditableOrder] = useState<EditableOrder | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeModal, setActiveModal] = useState<"junbiki" | "pallet" | "gap" | null>(null);
  const gapItems = buildGapItems(summaries);
  const activeRows = rows.filter((row) => row.statusOrder.toLowerCase() === "submitted");
  const deliveryRows = rows.filter((row) => row.statusOrder.toLowerCase() === "confirmed");
  const finishedRows = rows.filter((row) => row.statusOrder.toLowerCase() === "checked");

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

  async function handleEdit(order: OrderReportRow) {
    try {
      setLoadingEditId(order.orderId);
      const res = await fetch(`/api/ordering/${order.orderId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengambil detail order");
      }

      setEditableOrder(data);
      setActiveModal(data.truckType === "JUNBIKI" ? "junbiki" : data.truckType === "GAP" ? "gap" : "pallet");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      setToast({ type: "error", message });
    } finally {
      setLoadingEditId(null);
    }
  }

  function closeOrderModal() {
    setActiveModal(null);
    setEditableOrder(null);
  }

  return (
    <section className="space-y-5">
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
              <button
                type="button"
                onClick={() => setActiveModal("gap")}
                disabled={gapItems.length === 0}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                Request Gap
              </button>
            </div>
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
              <MetricRow
                label="Plan Order"
                value={summary.planProduksi}
                valueClassName="text-emerald-600"
              />
              <MetricRow
                label="Remaining Order"
                value={Math.max(summary.planProduksi - (summary.totalStock - summary.deliveryTotal) - summary.orderTotal, 0)}
                valueClassName="text-emerald-600"
              />
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
        pendingDeleteId={pendingDelete?.orderId ?? null}
        onRequestDelete={setPendingDelete}
        onEdit={handleEdit}
        loadingEditId={loadingEditId}
        showDelivery={false}
      />

      <OrderQueueTable
        title="Delivery Order"
        description={`Order dengan status Confirmed untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={deliveryRows}
        deletingId={deletingId}
        pendingDeleteId={pendingDelete?.orderId ?? null}
        onRequestDelete={setPendingDelete}
        onEdit={handleEdit}
        loadingEditId={loadingEditId}
        showDelivery
      />

      <OrderQueueTable
        title="Finish Order"
        description={`Order dengan status Checked untuk ${formatFilterLabel(selectedFilter)}.`}
        rows={finishedRows}
        deletingId={deletingId}
        pendingDeleteId={pendingDelete?.orderId ?? null}
        onRequestDelete={setPendingDelete}
        onEdit={handleEdit}
        loadingEditId={loadingEditId}
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
        <OrderingModal title="Order Junbiki" onClose={closeOrderModal} hideHeader>
          <JunbikiOrderForm
            orderId={editableOrder?.truckType === "JUNBIKI" ? editableOrder.orderId : undefined}
            initialKodeOrder={editableOrder?.truckType === "JUNBIKI" ? editableOrder.kodeOrder : undefined}
            initialValues={
              editableOrder?.truckType === "JUNBIKI"
                ? {
                    tanggal_order: editableOrder.tanggalOrder,
                    shift: editableOrder.shift as "RED" | "WHITE",
                    day_night: editableOrder.dayNight as "DAY" | "NIGHT",
                    ritase: editableOrder.ritaseRequest,
                    ratio_cb_1tr: editableOrder.ratioCb1tr,
                    ratio_cb_2tr: editableOrder.ratioCb2tr,
                    remark: editableOrder.remarksOrdering,
                    selected_shells: editableOrder.selectedShells,
                  }
                : {
                    tanggal_order: selectedFilter.date,
                    shift: selectedFilter.shift as "RED" | "WHITE",
                    day_night: selectedFilter.dayNight as "DAY" | "NIGHT",
                    ritase: 1,
                    ratio_cb_1tr: 0,
                    ratio_cb_2tr: 0,
                    remark: "",
                    selected_shells: [],
                  }
            }
            onCancel={closeOrderModal}
            onSuccess={(kodeOrder) => {
              closeOrderModal();
              setToast({ type: "success", message: `Order ${kodeOrder} berhasil disimpan` });
              router.refresh();
            }}
          />
        </OrderingModal>
      ) : null}

      {activeModal === "pallet" ? (
        <OrderingModal title="Order Pallet" onClose={closeOrderModal} size="wide">
          <PalletOrderForm
            embedded
            orderId={editableOrder?.truckType === "PALLET" ? editableOrder.orderId : undefined}
            initialKodeOrder={editableOrder?.truckType === "PALLET" ? editableOrder.kodeOrder : undefined}
            ritaseProgressDate={editableOrder?.truckType === "PALLET" ? editableOrder.tanggalOrder : selectedFilter.date}
            initialValues={
              editableOrder?.truckType === "PALLET"
                ? {
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
                  }
                : {
                    tanggalOrder: selectedFilter.date,
                    shift: selectedFilter.shift,
                    dayNight: selectedFilter.dayNight,
                    ritaseRequest: 1,
                    remarksOrdering: "",
                    items: {
                      CR_1TR: 0,
                      CAM_01: 0,
                      CAM_02: 0,
                      CB_1TR: 0,
                      CB_2TR: 0,
                    },
                  }
            }
            onCancel={closeOrderModal}
            onSuccess={(kodeOrder) => {
              closeOrderModal();
              setToast({ type: "success", message: `Order ${kodeOrder} berhasil disimpan` });
              router.refresh();
            }}
          />
        </OrderingModal>
      ) : null}

      {activeModal === "gap" ? (
        <OrderingModal title="Request Gap" onClose={closeOrderModal} size="compact">
          <RequestGapForm
            orderId={editableOrder?.truckType === "GAP" ? editableOrder.orderId : undefined}
            initialKodeOrder={editableOrder?.truckType === "GAP" ? editableOrder.kodeOrder : undefined}
            selectedDate={selectedFilter.date}
            initialValues={
              editableOrder?.truckType === "GAP"
                ? {
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
                  }
                : {
                    tanggalOrder: selectedFilter.date,
                    shift: selectedFilter.shift,
                    dayNight: selectedFilter.dayNight,
                    ritaseRequest: 1,
                    remarksOrdering: "",
                    items: gapItems,
                  }
            }
            onCancel={closeOrderModal}
            onSuccess={(kodeOrder) => {
              closeOrderModal();
              setToast({ type: "success", message: `Request gap ${kodeOrder} berhasil disimpan` });
              router.refresh();
            }}
          />
        </OrderingModal>
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
    </section>
  );
}

function OrderingModal({
  title,
  children,
  onClose,
  size = "default",
  hideHeader = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "compact" | "default" | "wide";
  hideHeader?: boolean;
}) {
  const sizeClassName =
    size === "wide" ? "max-w-[92vw]" : size === "compact" ? "max-w-4xl" : "max-w-[88vw]";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl ${
          sizeClassName
        }`}
      >
        {hideHeader ? null : (
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        )}
        <div className={hideHeader ? "px-6 py-6" : "px-6 py-5"}>{children}</div>
      </div>
    </div>
  );
}

function RequestGapForm({
  orderId,
  initialKodeOrder,
  selectedDate,
  initialValues,
  onCancel,
  onSuccess,
}: {
  orderId?: string;
  initialKodeOrder?: string;
  selectedDate: string;
  initialValues: {
    tanggalOrder: string;
    shift: string;
    dayNight: string;
    ritaseRequest: number;
    remarksOrdering: string;
    items: GapFormItem[];
  };
  onCancel: () => void;
  onSuccess: (kodeOrder: string) => void;
}) {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(orderId);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const activeItems = form.items.filter((item) => item.gapRequestQty > 0);
    if (activeItems.length === 0) {
      setError("Minimal satu item gap harus diisi");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(isEditing && orderId ? `/api/ordering/${orderId}` : "/api/ordering/gap", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggalOrder: form.tanggalOrder || selectedDate,
          shift: form.shift,
          dayNight: form.dayNight,
          ritaseRequest: form.ritaseRequest,
          remarksOrdering: form.remarksOrdering,
          items: form.items.map((item) => ({
            itemCode: item.itemCode,
            gapRequestQty: item.gapRequestQty,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal menyimpan request gap");
      }

      onSuccess(data.kodeOrder ?? initialKodeOrder ?? "GAP");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(itemCode: GapItemCode, gapRequestQty: number) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.itemCode === itemCode ? { ...item, gapRequestQty: Math.max(0, Math.round(gapRequestQty || 0)) } : item
      ),
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {isEditing ? "Edit Request Gap" : "Request Gap"}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          {initialKodeOrder ? `Request Gap ${initialKodeOrder}` : "Request Gap Baru"}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Tanggal Order">
          <input
            type="date"
            value={form.tanggalOrder}
            onChange={(event) => setForm((current) => ({ ...current, tanggalOrder: event.target.value }))}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500"
          />
        </Field>
        <SelectField
          label="Shift"
          value={form.shift}
          placeholder="Pilih Shift"
          options={["RED", "WHITE"]}
          onChange={(value) => setForm((current) => ({ ...current, shift: value }))}
        />
        <SelectField
          label="Day / Night"
          value={form.dayNight}
          placeholder="Pilih Day / Night"
          options={["DAY", "NIGHT"]}
          onChange={(value) => setForm((current) => ({ ...current, dayNight: value }))}
        />
        <SelectField
          label="Ritase Request"
          value={String(form.ritaseRequest)}
          options={Array.from({ length: 20 }, (_, index) => String(index + 1))}
          onChange={(value) =>
            setForm((current) => ({ ...current, ritaseRequest: Math.max(1, Number(value) || 1) }))
          }
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-100/90 text-slate-700">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold">Item</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Gap Saat Ini</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Qty Gap Request</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item) => (
              <tr key={item.itemCode} className="odd:bg-white even:bg-slate-50/60">
                <td className="border-b border-slate-200 px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.itemCode}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-rose-600">
                  {item.currentGap ? formatNumber(item.currentGap) : "-"}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={item.gapRequestQty}
                    onChange={(event) => updateItem(item.itemCode, Number(event.target.value))}
                    className="ml-auto block h-11 w-32 rounded-xl border border-slate-300 px-3 text-right text-sm outline-none transition focus:border-sky-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Field label="Remarks Ordering">
        <textarea
          value={form.remarksOrdering}
          onChange={(event) => setForm((current) => ({ ...current, remarksOrdering: event.target.value }))}
          className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
        />
      </Field>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Submit Request Gap"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-12 text-sm outline-none transition focus:border-sky-500"
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function OrderQueueTable({
  title,
  description,
  rows,
  deletingId,
  pendingDeleteId,
  onRequestDelete,
  onEdit,
  loadingEditId,
  showDelivery,
}: {
  title: string;
  description: string;
  rows: OrderReportRow[];
  deletingId: string | null;
  pendingDeleteId: string | null;
  onRequestDelete: (row: OrderReportRow | null) => void;
  onEdit: (row: OrderReportRow) => void;
  loadingEditId: string | null;
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
                  <NumericCell value={row.ritaseRequest} />
                  <NumericCell value={getOrderRequestQty(row, "cb1tr")} />
                  {showDelivery ? <NumericCell value={row.cb1tr.delivery} /> : null}
                  <NumericCell value={getOrderRequestQty(row, "cb2tr")} />
                  {showDelivery ? <NumericCell value={row.cb2tr.delivery} /> : null}
                  <NumericCell value={getOrderRequestQty(row, "camNo01")} />
                  {showDelivery ? <NumericCell value={row.camNo01.delivery} /> : null}
                  <NumericCell value={getOrderRequestQty(row, "camNo02")} />
                  {showDelivery ? <NumericCell value={row.camNo02.delivery} /> : null}
                  <NumericCell value={getOrderRequestQty(row, "cr1tr")} />
                  {showDelivery ? <NumericCell value={row.cr1tr.delivery} /> : null}
                  <RemarksCell value={row.remarksJunbikiS2} />
                  <RemarksCell value={row.remarksPalletS2} />
                  <RemarksCell value={row.remarksGapS2} />
                  <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap">
                    {row.statusOrder.toLowerCase() === "submitted" ? (
                      <div className="flex gap-2">
                        {row.truckType === "GAP" ? null : (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={loadingEditId === row.orderId || deletingId === row.orderId}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingEditId === row.orderId ? "Membuka..." : "Edit"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRequestDelete(row)}
                          disabled={deletingId === row.orderId}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === row.orderId || pendingDeleteId === row.orderId ? "Delete" : "Delete"}
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        Locked
                      </span>
                    )}
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

function ConfirmDeleteModal({
  order,
  deleting,
  onClose,
  onConfirm,
}: {
  order: OrderReportRow;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Delete Order</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">Hapus order ini?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Order <span className="font-semibold text-slate-900">{order.code}</span> akan dihapus permanen. Aksi ini hanya
          tersedia untuk status Submitted.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Ya, hapus"}
          </button>
        </div>
      </div>
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

function getOrderRequestQty(row: OrderReportRow, key: OrderItemSummary["key"]) {
  return row.truckType === "GAP" ? row[key].gapRequest ?? 0 : row[key].order;
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

const GAP_ITEM_LABELS: Record<GapItemCode, string> = {
  CB_1TR: "Cylinder Block 1TR",
  CB_2TR: "Cylinder Block 2TR",
  CAM_01: "Camshaft No. 01",
  CAM_02: "Camshaft No. 02",
  CR_1TR: "Crankshaft 1TR",
};

const SUMMARY_KEY_TO_GAP_ITEM: Record<OrderItemSummary["key"], GapItemCode> = {
  cb1tr: "CB_1TR",
  cb2tr: "CB_2TR",
  camNo01: "CAM_01",
  camNo02: "CAM_02",
  cr1tr: "CR_1TR",
};

function buildGapItems(summaries: OrderItemSummary[]): GapFormItem[] {
  return summaries
    .filter((summary) => summary.gap < 0)
    .map((summary) => {
      const itemCode = SUMMARY_KEY_TO_GAP_ITEM[summary.key];
      return {
        itemCode,
        label: GAP_ITEM_LABELS[itemCode],
        currentGap: summary.gap,
        gapRequestQty: Math.abs(summary.gap),
      };
    });
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
