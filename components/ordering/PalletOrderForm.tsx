"use client";

import RitaseProgressCard from "@/components/ordering/RitaseProgressCard";
import { getRitaseSchedule, RITASE_OPTIONS, type RitaseScheduleItem } from "@/lib/ritase-schedule";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ItemCode = "CR_1TR" | "CAM_01" | "CAM_02" | "CB_1TR" | "CB_2TR";

type PalletFormState = {
  tanggalOrder: string;
  shift: string;
  dayNight: string;
  ritaseRequest: number;
  remarksOrdering: string;
  items: Record<ItemCode, number>;
};

type PalletPlanState = Record<ItemCode, number>;

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type RitaseProgressState = {
  loading: boolean;
  orderCount: number;
  nextRitase: RitaseScheduleItem | null;
  schedule: RitaseScheduleItem[];
};

type PalletOrderFormProps = {
  embedded?: boolean;
  orderId?: string;
  initialValues?: PalletFormState | null;
  initialKodeOrder?: string;
  ritaseProgressDate?: string;
  onSuccess?: (kodeOrder: string) => void;
  onCancel?: () => void;
};

const shiftOptions = ["RED", "WHITE"];
const dayNightOptions = ["DAY", "NIGHT"];
const ritaseOptions = RITASE_OPTIONS.map(String);

const emptyForm: PalletFormState = {
  tanggalOrder: formatDateInput(new Date()),
  shift: "",
  dayNight: "",
  ritaseRequest: 1,
  remarksOrdering: "",
  items: {
    CR_1TR: 0,
    CAM_01: 0,
    CAM_02: 0,
    CB_1TR: 0,
    CB_2TR: 0,
  },
};

const emptyPlans: PalletPlanState = {
  CR_1TR: 0,
  CAM_01: 0,
  CAM_02: 0,
  CB_1TR: 0,
  CB_2TR: 0,
};

export default function PalletOrderForm({
  embedded = false,
  orderId,
  initialValues,
  initialKodeOrder,
  ritaseProgressDate,
  onSuccess,
  onCancel,
}: PalletOrderFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<PalletFormState>(initialValues ?? emptyForm);
  const [plans, setPlans] = useState<PalletPlanState>(emptyPlans);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [ritaseProgress, setRitaseProgress] = useState<RitaseProgressState>({
    loading: false,
    orderCount: 0,
    nextRitase: null,
    schedule: [],
  });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = Boolean(orderId);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setForm(initialValues ?? emptyForm);
  }, [initialValues]);

  useEffect(() => {
    if (!form.tanggalOrder || !form.shift || !form.dayNight) {
      setPlans(emptyPlans);
      return;
    }

    void loadPlans(form.tanggalOrder, form.shift, form.dayNight);
  }, [form.tanggalOrder, form.shift, form.dayNight]);

  function showToast(type: "success" | "error", message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }

  async function loadPlans(date: string, shift: string, dayNight: string) {
    try {
      setLoadingPlans(true);
      const params = new URLSearchParams({ date, shift, dayNight });
      const res = await fetch(`/api/ordering/pallet?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengambil plan produksi");
      }

      setPlans(data.plans ?? emptyPlans);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setPlans(emptyPlans);
      setError(message);
    } finally {
      setLoadingPlans(false);
    }
  }

  const loadRitaseProgress = useCallback(async (date: string, dayNight: string, signal: AbortSignal) => {
    setRitaseProgress((current) => ({
      ...current,
      loading: true,
      schedule: getRitaseSchedule(dayNight),
    }));

    try {
      const params = new URLSearchParams({ date, dayNight });
      if (orderId) {
        params.set("excludeOrderId", orderId);
      }

      const res = await fetch(`/api/ordering/ritase-progress?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengambil progress ritase");
      }

      setRitaseProgress({
        loading: false,
        orderCount: data.orderCount ?? 0,
        nextRitase: data.nextRitase ?? null,
        schedule: data.schedule ?? getRitaseSchedule(dayNight),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      setRitaseProgress({
        loading: false,
        orderCount: 0,
        nextRitase: null,
        schedule: getRitaseSchedule(dayNight),
      });
    }
  }, [orderId]);

  useEffect(() => {
    if (!form.dayNight) {
      setRitaseProgress({
        loading: false,
        orderCount: 0,
        nextRitase: null,
        schedule: [],
      });
      return;
    }

    const controller = new AbortController();
    void loadRitaseProgress(form.tanggalOrder || ritaseProgressDate || formatDateInput(new Date()), form.dayNight, controller.signal);

    return () => controller.abort();
  }, [form.tanggalOrder, form.dayNight, loadRitaseProgress, ritaseProgressDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        tanggalOrder: form.tanggalOrder,
        shift: form.shift,
        dayNight: form.dayNight,
        ritaseRequest: form.ritaseRequest,
        remarksOrdering: form.remarksOrdering,
        items: Object.entries(form.items).map(([itemCode, qtyOrder]) => ({
          itemCode,
          qtyOrder,
        })),
      };

      const res = await fetch(isEditing && orderId ? `/api/ordering/${orderId}` : "/api/ordering/pallet", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal membuat order pallet");
      }

      setForm(initialValues ?? emptyForm);
      setPlans(emptyPlans);
      onSuccess?.(data.kodeOrder ?? initialKodeOrder ?? "");

      if (embedded) {
        router.refresh();
      } else {
        const params = new URLSearchParams({
          success: `Order ${data.kodeOrder} berhasil ${isEditing ? "diperbarui" : "dibuat"}`,
        });
        router.push(`/ordering?${params.toString()}`);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function updateItem(itemCode: ItemCode, qtyOrder: number) {
    setForm((current) => ({
      ...current,
      items: {
        ...current.items,
        [itemCode]: qtyOrder,
      },
    }));
  }

  return (
    <section className={embedded ? "space-y-5" : "space-y-5"}>
      {!embedded ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Ordering</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Order Pallet</h1>
          <p className="mt-2 text-sm text-slate-600">
            Buat order Pallet dalam satu kali submit, lengkap dengan header dan item order.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_max-content] xl:items-end">
            <div>
              <DateField
                label="Tanggal Order"
                value={form.tanggalOrder}
                onChange={(value) => setForm((current) => ({ ...current, tanggalOrder: value }))}
              />
            </div>
            <div>
              <SelectField
                label="Shift"
                value={form.shift}
                options={shiftOptions}
                placeholder="Pilih shift"
                onChange={(value) => setForm((current) => ({ ...current, shift: value }))}
              />
            </div>
            <div>
              <SelectField
                label="Day / Night"
                value={form.dayNight}
                options={dayNightOptions}
                placeholder="Pilih day / night"
                onChange={(value) => setForm((current) => ({ ...current, dayNight: value }))}
              />
            </div>
            <div>
              <SelectField
                label="Ritase Request"
                value={String(form.ritaseRequest)}
                options={ritaseOptions}
                placeholder="Pilih ritase"
                onChange={(value) => setForm((current) => ({ ...current, ritaseRequest: Number(value || 1) }))}
              />
            </div>
            {isEditing ? null : (
              <RitaseProgressCard
                loading={ritaseProgress.loading}
                nextRitase={ritaseProgress.nextRitase}
                schedule={ritaseProgress.schedule}
              />
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks Ordering</label>
            <textarea
              value={form.remarksOrdering}
              onChange={(event) => setForm((current) => ({ ...current, remarksOrdering: event.target.value }))}
              className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <ItemCard title="Crankshaft 1TR">
            <OrderItemRow
              label="Crankshaft 1TR"
              planValue={plans.CR_1TR}
              qtyValue={form.items.CR_1TR}
              loadingPlans={loadingPlans}
              onQtyChange={(value) => updateItem("CR_1TR", value)}
            />
          </ItemCard>

          <ItemCard title="Camshaft">
            <OrderItemRow
              label="Camshaft No. 01"
              badgeLabel="Kuning"
              badgeColor="yellow"
              planValue={plans.CAM_01}
              qtyValue={form.items.CAM_01}
              loadingPlans={loadingPlans}
              onQtyChange={(value) => updateItem("CAM_01", value)}
            />
            <OrderItemRow
              label="Camshaft No. 02"
              badgeLabel="Hijau"
              badgeColor="green"
              planValue={plans.CAM_02}
              qtyValue={form.items.CAM_02}
              loadingPlans={loadingPlans}
              onQtyChange={(value) => updateItem("CAM_02", value)}
            />
          </ItemCard>

          <ItemCard title="Cylinder Block">
            <OrderItemRow
              label="Cylinder Block 1TR"
              planValue={plans.CB_1TR}
              qtyValue={form.items.CB_1TR}
              loadingPlans={loadingPlans}
              onQtyChange={(value) => updateItem("CB_1TR", value)}
            />
            <OrderItemRow
              label="Cylinder Block 2TR"
              planValue={plans.CB_2TR}
              qtyValue={form.items.CB_2TR}
              loadingPlans={loadingPlans}
              onQtyChange={(value) => updateItem("CB_2TR", value)}
            />
          </ItemCard>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : isEditing ? "Update Order" : "Buat Order Baru"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(initialValues ?? emptyForm);
              setPlans(emptyPlans);
              setError("");
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
          {embedded && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tutup
            </button>
          ) : null}
        </div>
      </form>

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
    </section>
  );
}

function ItemCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </article>
  );
}

function OrderItemRow({
  label,
  badgeLabel,
  badgeColor,
  planValue,
  qtyValue,
  loadingPlans,
  onQtyChange,
}: {
  label: string;
  badgeLabel?: string;
  badgeColor?: "yellow" | "green";
  planValue: number;
  qtyValue: number;
  loadingPlans: boolean;
  onQtyChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {badgeLabel ? <Badge label={badgeLabel} color={badgeColor} /> : null}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          Order Need: {loadingPlans ? "Memuat..." : formatNumber(planValue)}
        </p>
      </div>

      <div className="mt-3">
        <NumberField label="Qty Order" value={qtyValue} onChange={onQtyChange} />
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color?: "yellow" | "green" }) {
  const className =
    color === "yellow"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : color === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-500"
      />
    </div>
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
  placeholder: string;
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
          <option value="">{placeholder}</option>
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : String(value)}
        onChange={(event) => {
          const numeric = event.target.value.replace(/[^\d]/g, "");
          onChange(Number(numeric || 0));
        }}
        onBlur={() => {
          if (value === 0) {
            onChange(0);
          }
        }}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500"
      />
    </div>
  );
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}
