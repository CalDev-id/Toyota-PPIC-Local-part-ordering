"use client";

import RitaseProgressCard from "@/components/ordering/RitaseProgressCard";
import { getRitaseSchedule, RITASE_OPTIONS, type RitaseScheduleItem } from "@/lib/ritase-schedule";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Shift = "RED" | "WHITE";
type DayNight = "DAY" | "NIGHT";
type ShellStatus = "idle" | "active" | "blocked";
type ShellSectionKey = "CB_1TR" | "CB_2TR";

type ShellItem = {
  code: string;
  groupNumber: number;
  section: ShellSectionKey;
};

type JunbikiOrderHeader = {
  tanggal_order: string;
  shift: Shift | "";
  day_night: DayNight | "";
  ritase: number;
  ratio_cb_1tr: number;
  ratio_cb_2tr: number;
  remark: string;
};

type ShellStatusMap = Record<string, ShellStatus>;

type JunbikiOrderPayload = JunbikiOrderHeader & {
  cb_1tr_enabled: boolean;
  cb_2tr_enabled: boolean;
  selected_shells: Array<{
    code: string;
    section: ShellSectionKey;
    status: ShellStatus;
    groupNumber: number;
  }>;
};

type JunbikiSummary = {
  qtyCb1tr: number;
  qtyCb2tr: number;
  totalQty: number;
  ratioTotal: number;
  ratioQtyCb1tr: number;
  ratioQtyCb2tr: number;
  isOverLimit: boolean;
  isRatioMismatch: boolean;
  activeShellCount: number;
  blockedShellCount: number;
};

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

type OrderNeedState = {
  loading: boolean;
  values: Record<ShellSectionKey, number>;
};

type JunbikiOrderFormProps = {
  orderId?: string;
  initialValues?: {
    tanggal_order: string;
    shift: Shift | "";
    day_night: DayNight | "";
    ritase: number;
    ratio_cb_1tr: number;
    ratio_cb_2tr: number;
    remark: string;
    selected_shells: Array<{
      code: string;
      section: ShellSectionKey;
      status: ShellStatus;
      groupNumber: number;
    }>;
  } | null;
  initialKodeOrder?: string;
  onCancel?: () => void;
  onSuccess?: (kodeOrder: string) => void;
};

const SHIFT_OPTIONS: Shift[] = ["RED", "WHITE"];
const DAY_NIGHT_OPTIONS: DayNight[] = ["DAY", "NIGHT"];
const MAX_TOTAL_QTY = 90;
const PCS_PER_GROUP = 5;

const SECTION_META: Record<
  ShellSectionKey,
  { title: string; accentClassName: string }
> = {
  CB_1TR: {
    title: "CB 1TR",
    accentClassName: "from-emerald-500/20 via-emerald-500/10 to-white",
  },
  CB_2TR: {
    title: "CB 2TR",
    accentClassName: "from-sky-500/20 via-sky-500/10 to-white",
  },
};

const SHELL_SECTIONS: Record<ShellSectionKey, ShellItem[]> = {
  CB_1TR: buildShellItems("CB_1TR", 1, 3),
  CB_2TR: buildShellItems("CB_2TR", 4, 12),
};

const ALL_SHELLS = [...SHELL_SECTIONS.CB_1TR, ...SHELL_SECTIONS.CB_2TR];

const EMPTY_HEADER: JunbikiOrderHeader = {
  tanggal_order: getTodayInputValue(),
  shift: "",
  day_night: "",
  ritase: 1,
  ratio_cb_1tr: 0,
  ratio_cb_2tr: 0,
  remark: "",
};

const EMPTY_SHELL_STATUSES: ShellStatusMap = ALL_SHELLS.reduce<ShellStatusMap>((accumulator, shell) => {
  accumulator[shell.code] = "idle";
  return accumulator;
}, {});

export default function JunbikiOrderForm({
  orderId,
  initialValues,
  initialKodeOrder,
  onCancel,
  onSuccess,
}: JunbikiOrderFormProps) {
  const [header, setHeader] = useState<JunbikiOrderHeader>(() => buildInitialHeader(initialValues));
  const [shellStatuses, setShellStatuses] = useState<ShellStatusMap>(() => buildInitialShellStatuses(initialValues));
  const [savingAction, setSavingAction] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [ritaseProgress, setRitaseProgress] = useState<RitaseProgressState>({
    loading: false,
    orderCount: 0,
    nextRitase: null,
    schedule: [],
  });
  const [orderNeed, setOrderNeed] = useState<OrderNeedState>({
    loading: false,
    values: { CB_1TR: 0, CB_2TR: 0 },
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
    setHeader(buildInitialHeader(initialValues));
    setShellStatuses(buildInitialShellStatuses(initialValues));
  }, [initialValues]);

  const summary = useMemo(
    () => calculateJunbikiSummary(shellStatuses, header.ratio_cb_1tr, header.ratio_cb_2tr),
    [shellStatuses, header.ratio_cb_1tr, header.ratio_cb_2tr]
  );

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

  function updateHeader<Key extends keyof JunbikiOrderHeader>(key: Key, value: JunbikiOrderHeader[Key]) {
    setHeader((current) => ({ ...current, [key]: value }));
  }

  const loadRitaseProgress = useCallback(async (date: string, dayNight: DayNight, signal: AbortSignal) => {
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

      const response = await fetch(`/api/ordering/ritase-progress?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
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

  const loadOrderNeed = useCallback(async (
    date: string,
    shift: Shift,
    dayNight: DayNight,
    signal: AbortSignal
  ) => {
    setOrderNeed((current) => ({ ...current, loading: true }));

    try {
      const params = new URLSearchParams({ date, shift, dayNight });
      if (orderId) {
        params.set("excludeOrderId", orderId);
      }

      const response = await fetch(`/api/ordering/junbiki?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal mengambil order need Junbiki");
      }

      setOrderNeed({
        loading: false,
        values: {
          CB_1TR: data.orderNeeds?.CB_1TR ?? 0,
          CB_2TR: data.orderNeeds?.CB_2TR ?? 0,
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      setOrderNeed({
        loading: false,
        values: { CB_1TR: 0, CB_2TR: 0 },
      });
    }
  }, [orderId]);

  useEffect(() => {
    if (!header.tanggal_order || !header.day_night) {
      setRitaseProgress({
        loading: false,
        orderCount: 0,
        nextRitase: null,
        schedule: getRitaseSchedule(header.day_night),
      });
      return;
    }

    const controller = new AbortController();
    void loadRitaseProgress(header.tanggal_order, header.day_night, controller.signal);

    return () => controller.abort();
  }, [header.tanggal_order, header.day_night, loadRitaseProgress]);

  useEffect(() => {
    if (!header.tanggal_order || !header.shift || !header.day_night) {
      setOrderNeed({
        loading: false,
        values: { CB_1TR: 0, CB_2TR: 0 },
      });
      return;
    }

    const controller = new AbortController();
    void loadOrderNeed(header.tanggal_order, header.shift, header.day_night, controller.signal);

    return () => controller.abort();
  }, [header.tanggal_order, header.shift, header.day_night, loadOrderNeed]);

  function handleToggleShell(shell: ShellItem) {
    const currentStatus = shellStatuses[shell.code] ?? "idle";

    if (currentStatus === "idle" && summary.totalQty >= MAX_TOTAL_QTY) {
      showToast("error", `Total shell aktif sudah mencapai batas ${MAX_TOTAL_QTY} pcs.`);
      return;
    }

    setShellStatuses((current) => ({
      ...current,
      [shell.code]: getNextShellStatus(currentStatus),
    }));
  }

  function resetForm() {
    setHeader(buildInitialHeader(initialValues));
    setShellStatuses(buildInitialShellStatuses(initialValues));
    setSavingAction(null);
    setError("");
  }

  function buildPayload(): JunbikiOrderPayload {
    return {
      ...header,
      cb_1tr_enabled: true,
      cb_2tr_enabled: true,
      selected_shells: ALL_SHELLS.map((shell) => ({
        code: shell.code,
        section: shell.section,
        status: shellStatuses[shell.code] ?? "idle",
        groupNumber: shell.groupNumber,
      })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingAction("submit");
      setError("");

      if (summary.isOverLimit) {
        throw new Error("Total rasio produksi melebihi batas maksimal 90 pcs.");
      }

      const payload = buildPayload();
      const response = await fetch(isEditing && orderId ? `/api/ordering/${orderId}` : "/api/ordering/junbiki", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal membuat order Junbiki");
      }

      onSuccess?.(data.kodeOrder ?? initialKodeOrder ?? "");
      resetForm();
      showToast(
        "success",
        `Order ${data.kodeOrder ?? initialKodeOrder ?? ""} berhasil ${isEditing ? "diperbarui" : "dibuat"}.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      showToast("error", message);
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <section className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <OrderFormHeader
          header={header}
          ritaseProgress={ritaseProgress}
          onChange={updateHeader}
          onClose={onCancel}
          isEditing={isEditing}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.65fr)]">
          <ShellGridSection
            section="CB_1TR"
            shells={SHELL_SECTIONS.CB_1TR}
            shellStatuses={shellStatuses}
            selectedQty={summary.qtyCb1tr}
            orderNeed={orderNeed.values.CB_1TR}
            loadingOrderNeed={orderNeed.loading}
            onToggleShell={handleToggleShell}
          />
          <ShellGridSection
            section="CB_2TR"
            shells={SHELL_SECTIONS.CB_2TR}
            shellStatuses={shellStatuses}
            selectedQty={summary.qtyCb2tr}
            orderNeed={orderNeed.values.CB_2TR}
            loadingOrderNeed={orderNeed.loading}
            onToggleShell={handleToggleShell}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[max-content_minmax(0,1fr)]">
          <RatioCalculatorCard header={header} summary={summary} onChange={updateHeader} />
          <div className="space-y-5">
            <RemarkPanel value={header.remark} onChange={(value) => updateHeader("remark", value)} />

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <ActionBar
              savingAction={savingAction}
              onReset={resetForm}
              isEditing={isEditing}
            />
          </div>
        </div>
      </form>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[120] max-w-sm">
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

function OrderFormHeader({
  header,
  ritaseProgress,
  onChange,
  onClose,
  isEditing = false,
}: {
  header: JunbikiOrderHeader;
  ritaseProgress: RitaseProgressState;
  onChange: <Key extends keyof JunbikiOrderHeader>(key: Key, value: JunbikiOrderHeader[Key]) => void;
  onClose?: () => void;
  isEditing?: boolean;
}) {
  return (
    <section className="pb-2">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Edit Order Junbiki" : "Order Junbiki"}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_max-content] xl:items-end">
        <div>
          <DateField label="Tanggal Order" value={header.tanggal_order} onChange={(value) => onChange("tanggal_order", value)} />
        </div>
        <div>
          <SelectField
            label="Shift"
            value={header.shift}
            options={SHIFT_OPTIONS}
            placeholder="Pilih shift"
            onChange={(value) => onChange("shift", value as Shift | "")}
          />
        </div>
        <div>
          <SelectField
            label="Day / Night"
            value={header.day_night}
            options={DAY_NIGHT_OPTIONS}
            placeholder="Pilih day / night"
            onChange={(value) => onChange("day_night", value as DayNight | "")}
          />
        </div>
        <div>
          <SelectField
            label="Ritase"
            value={String(header.ritase)}
            options={RITASE_OPTIONS.map(String)}
            placeholder="Pilih ritase"
            onChange={(value) => onChange("ritase", Number(value || 1))}
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
    </section>
  );
}

function buildInitialHeader(
  initialValues: JunbikiOrderFormProps["initialValues"]
): JunbikiOrderHeader {
  if (!initialValues) {
    return EMPTY_HEADER;
  }

  return {
    tanggal_order: initialValues.tanggal_order,
    shift: initialValues.shift,
    day_night: initialValues.day_night,
    ritase: initialValues.ritase,
    ratio_cb_1tr: initialValues.ratio_cb_1tr,
    ratio_cb_2tr: initialValues.ratio_cb_2tr,
    remark: initialValues.remark,
  };
}

function buildInitialShellStatuses(
  initialValues: JunbikiOrderFormProps["initialValues"]
): ShellStatusMap {
  const next = { ...EMPTY_SHELL_STATUSES };

  if (!initialValues) {
    return next;
  }

  for (const shell of initialValues.selected_shells) {
    next[shell.code] = shell.status;
  }

  return next;
}

function ShellGridSection({
  section,
  shells,
  shellStatuses,
  selectedQty,
  orderNeed,
  loadingOrderNeed,
  onToggleShell,
}: {
  section: ShellSectionKey;
  shells: ShellItem[];
  shellStatuses: ShellStatusMap;
  selectedQty: number;
  orderNeed: number;
  loadingOrderNeed: boolean;
  onToggleShell: (shell: ShellItem) => void;
}) {
  const sectionMeta = SECTION_META[section];
  const groupedShells = groupShellsByLetter(shells);

  return (
    <section className={`rounded-3xl border border-slate-200 bg-gradient-to-br bg-white p-5 shadow-sm transition ${sectionMeta.accentClassName}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900">{sectionMeta.title}</h3>
          <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{formatNumber(selectedQty)}</span> pcs
          </div>
        </div>
        <div className="w-fit rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-sm text-slate-600 sm:ml-auto">
          Order Need:{" "}
          <span className="font-semibold text-slate-900">
            {loadingOrderNeed ? "Memuat..." : formatNumber(orderNeed)}
          </span>
        </div>
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

function RatioCalculatorCard({
  header,
  summary,
  onChange,
}: {
  header: JunbikiOrderHeader;
  summary: JunbikiSummary;
  onChange: <Key extends keyof JunbikiOrderHeader>(key: Key, value: JunbikiOrderHeader[Key]) => void;
}) {
  return (
    <section className="w-fit rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rasio Produksi</p>

      <div className="mt-5 space-y-3">
        <RatioRow
          label="CB 1TR"
          ratioValue={header.ratio_cb_1tr}
          qtyValue={summary.ratioQtyCb1tr}
          onRatioChange={(value) => onChange("ratio_cb_1tr", value)}
        />
        <RatioRow
          label="CB 2TR"
          ratioValue={header.ratio_cb_2tr}
          qtyValue={summary.ratioQtyCb2tr}
          onRatioChange={(value) => onChange("ratio_cb_2tr", value)}
        />
      </div>
    </section>
  );
}

function RatioRow({
  label,
  ratioValue,
  qtyValue,
  onRatioChange,
}: {
  label: string;
  ratioValue: number;
  qtyValue: number;
  onRatioChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[92px_120px_24px_110px] md:items-center">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <NumberField label="Ratio" value={ratioValue} onChange={onRatioChange} compact />
      <div className="hidden text-center text-slate-400 md:block">→</div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Qty</label>
        <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{formatNumber(qtyValue)}</span>
          <span>Pcs</span>
        </div>
      </div>
    </div>
  );
}

function RemarkPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Remark</p> 
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tambahkan informasi jika ada konfirmasi atau problem pada shell."
        className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
      />
    </section>
  );
}

function ActionBar({
  savingAction,
  onReset,
  isEditing = false,
}: {
  savingAction: "draft" | "submit" | null;
  onReset: () => void;
  isEditing?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        onClick={onReset}
        disabled={savingAction !== null}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Reset
      </button>
      <button
        type="submit"
        disabled={savingAction !== null}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingAction === "submit" ? "Menyimpan..." : isEditing ? "Update Order" : "Submit Order"}
      </button>
    </div>
  );
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
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500"
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
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
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
        className={`w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500 ${
          compact ? "h-11" : "h-11"
        }`}
      />
    </div>
  );
}

function LegendBadge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full border px-2.5 py-1 ${className}`}>{label}</span>;
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

export function getNextShellStatus(currentStatus: ShellStatus): ShellStatus {
  if (currentStatus === "idle") {
    return "active";
  }

  if (currentStatus === "active") {
    return "blocked";
  }

  return "idle";
}

export function calculateJunbikiSummary(
  shellStatuses: ShellStatusMap,
  ratioCb1tr: number,
  ratioCb2tr: number
): JunbikiSummary {
  let activeShellCount = 0;
  let blockedShellCount = 0;
  let qtyCb1tr = 0;
  let qtyCb2tr = 0;

  for (const section of Object.keys(SHELL_SECTIONS) as ShellSectionKey[]) {
    for (const shell of SHELL_SECTIONS[section]) {
      const status = shellStatuses[shell.code] ?? "idle";

      if (status === "active") {
        activeShellCount += 1;
        if (section === "CB_1TR") {
          qtyCb1tr += PCS_PER_GROUP;
        } else {
          qtyCb2tr += PCS_PER_GROUP;
        }
      }

      if (status === "blocked") {
        blockedShellCount += 1;
      }
    }
  }

  const totalQty = qtyCb1tr + qtyCb2tr;
  const ratioTotal = ratioCb1tr + ratioCb2tr;
  const { qty1tr: ratioQtyCb1tr, qty2tr: ratioQtyCb2tr } = splitRatioIntoQty(ratioCb1tr, ratioCb2tr);

  return {
    qtyCb1tr,
    qtyCb2tr,
    totalQty,
    ratioTotal,
    ratioQtyCb1tr,
    ratioQtyCb2tr,
    isOverLimit: ratioTotal > MAX_TOTAL_QTY,
    isRatioMismatch: ratioTotal !== totalQty,
    activeShellCount,
    blockedShellCount,
  };
}

function splitRatioIntoQty(ratioCb1tr: number, ratioCb2tr: number) {
  const ratioTotal = ratioCb1tr + ratioCb2tr;

  if (ratioTotal <= 0) {
    return {
      qty1tr: 0,
      qty2tr: 0,
    };
  }

  const rawQty1tr = (ratioCb1tr / ratioTotal) * MAX_TOTAL_QTY;
  const roundedQty1tr = roundToNearestFive(rawQty1tr);
  const qty1tr = Math.min(MAX_TOTAL_QTY, Math.max(0, roundedQty1tr));
  const qty2tr = MAX_TOTAL_QTY - qty1tr;

  return {
    qty1tr,
    qty2tr,
  };
}
// ini shell junbiki
function getShellStatusClassName(status: ShellStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
  // return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function roundToNearestFive(value: number) {
  return Math.round(value / PCS_PER_GROUP) * PCS_PER_GROUP;
}
