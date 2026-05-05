"use client";

import { getDefaultDayNightByTime } from "@/lib/day-night";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type PlanningRecord = {
  planId: string;
  tanggal: string;
  shift: string;
  dayNight: string;
  stockAwalJunbikiCb1tr: number;
  stockAwalJunbikiCb2tr: number;
  stockAwalEmergencyCb1tr: number;
  stockAwalEmergencyCb2tr: number;
  stockAwalEmergencyCr1tr: number;
  stockAwalEmergencyCam01: number;
  stockAwalEmergencyCam02: number;
  planProdCb1tr: number;
  planProdCb2tr: number;
  planProdCr1tr: number;
  planProdCam01: number;
  planProdCam02: number;
  inputBy: string;
  inputAt: string;
  remarks: string;
};

type PlanningFormValues = Omit<PlanningRecord, "planId" | "inputBy" | "inputAt">;

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const shiftOptions = ["RED", "WHITE"];
const PAGE_SIZE = 7;

export default function PlanningPageClient() {
  const [records, setRecords] = useState<PlanningRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedShift, setSelectedShift] = useState("WHITE");
  const [selectedDayNight, setSelectedDayNight] = useState<string>(getDefaultDayNightByTime());
  const [form, setForm] = useState<PlanningFormValues>(() => buildEmptyForm(getTodayInputValue()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Pick<PlanningRecord, "planId" | "inputBy" | "inputAt"> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/planning", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengambil data planning");
      }

      setRecords(data);
      setCurrentPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadRecords();

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [loadRecords]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const isEditing = editingId !== null;
      const res = await fetch(isEditing ? `/api/planning/${editingId}` : "/api/planning", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan planning");
      }

      await loadRecords();
      resetForm();
      setModalOpen(false);
      showToast("success", isEditing ? "Planning berhasil diperbarui" : "Planning berhasil dibuat");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      const res = await fetch(`/api/planning/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menghapus planning");
      }

      if (editingId === id) {
        resetForm();
      }

      await loadRecords();
      showToast("success", "Planning berhasil dihapus");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      showToast("error", message);
    }
  }

  function handleEdit(record: PlanningRecord) {
    setEditingId(record.planId);
    setEditingMeta({
      planId: record.planId,
      inputBy: record.inputBy,
      inputAt: record.inputAt,
    });
    setForm({
      tanggal: record.tanggal,
      shift: record.shift,
      dayNight: record.dayNight,
      stockAwalJunbikiCb1tr: record.stockAwalJunbikiCb1tr,
      stockAwalJunbikiCb2tr: record.stockAwalJunbikiCb2tr,
      stockAwalEmergencyCb1tr: record.stockAwalEmergencyCb1tr,
      stockAwalEmergencyCb2tr: record.stockAwalEmergencyCb2tr,
      stockAwalEmergencyCr1tr: record.stockAwalEmergencyCr1tr,
      stockAwalEmergencyCam01: record.stockAwalEmergencyCam01,
      stockAwalEmergencyCam02: record.stockAwalEmergencyCam02,
      planProdCb1tr: record.planProdCb1tr,
      planProdCb2tr: record.planProdCb2tr,
      planProdCr1tr: record.planProdCr1tr,
      planProdCam01: record.planProdCam01,
      planProdCam02: record.planProdCam02,
      remarks: record.remarks,
    });
    setError("");
    setModalOpen(true);
  }

  function resetForm(nextDate = getTodayInputValue()) {
    setEditingId(null);
    setEditingMeta(null);
    setForm(buildEmptyForm(nextDate));
  }

  function openCreateModal() {
    resetForm(selectedDate);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setError("");
    resetForm(selectedDate);
  }

  function updateField<Key extends keyof PlanningFormValues>(key: Key, value: PlanningFormValues[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const filteredSummaryRecords = records.filter((record) => {
    const matchesDate = !selectedDate || record.tanggal === selectedDate;
    const matchesShift = !selectedShift || record.shift === selectedShift;
    const matchesDayNight = !selectedDayNight || record.dayNight === selectedDayNight;
    return matchesDate && matchesShift && matchesDayNight;
  });

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = records.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );
  const latestRecord = filteredSummaryRecords[0] ?? null;
  const summaryCards = [
    {
      label: "CB 1TR",
      stock: latestRecord ? latestRecord.stockAwalJunbikiCb1tr + latestRecord.stockAwalEmergencyCb1tr : 0,
      plan: latestRecord?.planProdCb1tr ?? 0,
    },
    {
      label: "CB 2TR",
      stock: latestRecord ? latestRecord.stockAwalJunbikiCb2tr + latestRecord.stockAwalEmergencyCb2tr : 0,
      plan: latestRecord?.planProdCb2tr ?? 0,
    },
    {
      label: "CR 1TR",
      stock: latestRecord?.stockAwalEmergencyCr1tr ?? 0,
      plan: latestRecord?.planProdCr1tr ?? 0,
    },
    {
      label: "Cam 01",
      stock: latestRecord?.stockAwalEmergencyCam01 ?? 0,
      plan: latestRecord?.planProdCam01 ?? 0,
    },
    {
      label: "Cam 02",
      stock: latestRecord?.stockAwalEmergencyCam02 ?? 0,
      plan: latestRecord?.planProdCam02 ?? 0,
    },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Planning Management
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Daily Planning</h1>
              <p className="mt-1 text-sm text-slate-600">
                Ringkasan stock awal, plan produksi, dan gap planning terbaru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create Plan
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-500"
            />
          </div>

          <SelectField
            label="Shift"
            value={selectedShift}
            options={shiftOptions}
            placeholder=""
            onChange={(value) => {
              setSelectedShift(value);
              setCurrentPage(1);
            }}
          />

          <SelectField
            label="Day / Night"
            value={selectedDayNight}
            options={["DAY", "NIGHT"]}
            placeholder=""
            onChange={(value) => {
              setSelectedDayNight(value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <div className="mt-4 space-y-3">
              <MetricRow label="Stock Awal" value={item.stock} />
              <MetricRow label="Plan" value={item.plan} />
              <MetricRow
                label="Plan Order"
                value={Math.max(item.plan - item.stock, 0)}
                valueClassName="text-emerald-600"
              />
            </div>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">History Plan</h2>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Memuat data planning...</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Belum ada data planning.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100/90 text-slate-700">
                  <tr>
                    <TableHead label="Tanggal" className="min-w-[140px]" />
                    <TableHead label="Shift" />
                    <TableHead label="Day/Night" />
                    <TableHead label="StawCB1TRjun" />
                    <TableHead label="StawCB2TRjun" />
                    <TableHead label="StawCB1TREm" />
                    <TableHead label="StawCB2TREm" />
                    <TableHead label="StawCR1TR" />
                    <TableHead label="StawCA01" />
                    <TableHead label="StawCA02" />
                    <TableHead label="Plan_Prod_CR1TR" />
                    <TableHead label="Plan_Prod_CB1TR" />
                    <TableHead label="Plan_Prod_CB2TR" />
                    <TableHead label="Plan_Prod_Cam01" />
                    <TableHead label="Plan_Prod_Cam02" />
                    <TableHead label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => (
                    <tr key={record.planId} className="align-top odd:bg-white even:bg-slate-50/60">
                      <TableCell value={record.tanggal} className="min-w-[140px] whitespace-nowrap" />
                      <TableCell value={record.shift} />
                      <TableCell value={record.dayNight || "-"} />
                      <TableCell value={formatNumber(record.stockAwalJunbikiCb1tr)} />
                      <TableCell value={formatNumber(record.stockAwalJunbikiCb2tr)} />
                      <TableCell value={formatNumber(record.stockAwalEmergencyCb1tr)} />
                      <TableCell value={formatNumber(record.stockAwalEmergencyCb2tr)} />
                      <TableCell value={formatNumber(record.stockAwalEmergencyCr1tr)} />
                      <TableCell value={formatNumber(record.stockAwalEmergencyCam01)} />
                      <TableCell value={formatNumber(record.stockAwalEmergencyCam02)} />
                      <TableCell value={formatNumber(record.planProdCr1tr)} />
                      <TableCell value={formatNumber(record.planProdCb1tr)} />
                      <TableCell value={formatNumber(record.planProdCb2tr)} />
                      <TableCell value={formatNumber(record.planProdCam01)} />
                      <TableCell value={formatNumber(record.planProdCam02)} />
                      <td className="border-b border-slate-200 px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record.planId)}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Menampilkan {(safeCurrentPage - 1) * PAGE_SIZE + 1}-{Math.min(safeCurrentPage * PAGE_SIZE, records.length)} dari {records.length} data
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
                      page === safeCurrentPage
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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

      {modalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Planning</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingId ? "Edit Planning" : "Create Plan"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Input stock awal dan planning produksi harian dari modal.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {editingMeta ? (
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 md:grid-cols-3">
                  <ReadOnlyMeta label="Plan ID" value={editingMeta.planId} />
                  <ReadOnlyMeta label="Input By" value={editingMeta.inputBy || "-"} />
                  <ReadOnlyMeta label="Input At" value={formatDateTime(editingMeta.inputAt)} />
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Shift"
                      value={form.shift}
                      options={shiftOptions}
                      placeholder="Pilih shift"
                      onChange={(value) => updateField("shift", value)}
                    />
                    <SelectField
                      label="Day / Night"
                      value={form.dayNight}
                      options={["DAY", "NIGHT"]}
                      placeholder="Pilih day / night"
                      onChange={(value) => updateField("dayNight", value)}
                    />
                  </div>

                  <div className="xl:ml-auto xl:w-[220px]">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal</label>
                    <input
                      type="date"
                      value={form.tanggal}
                      onChange={(event) => updateField("tanggal", event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Stock Awal</h3>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Junbiki</p>
                        <div className="grid gap-3">
                          <NumberField label="CB 1TR" value={form.stockAwalJunbikiCb1tr} onChange={(value) => updateField("stockAwalJunbikiCb1tr", value)} />
                          <NumberField label="CB 2TR" value={form.stockAwalJunbikiCb2tr} onChange={(value) => updateField("stockAwalJunbikiCb2tr", value)} />
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Emergency Stock</p>
                        <div className="grid gap-3">
                          <NumberField label="CB 1TR" value={form.stockAwalEmergencyCb1tr} onChange={(value) => updateField("stockAwalEmergencyCb1tr", value)} />
                          <NumberField label="CB 2TR" value={form.stockAwalEmergencyCb2tr} onChange={(value) => updateField("stockAwalEmergencyCb2tr", value)} />
                          <NumberField label="CR 1TR" value={form.stockAwalEmergencyCr1tr} onChange={(value) => updateField("stockAwalEmergencyCr1tr", value)} />
                          <NumberField label="Cam 01" value={form.stockAwalEmergencyCam01} onChange={(value) => updateField("stockAwalEmergencyCam01", value)} />
                          <NumberField label="Cam 02" value={form.stockAwalEmergencyCam02} onChange={(value) => updateField("stockAwalEmergencyCam02", value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Planning Produksi</h3>
                    <div className="mt-4 space-y-3">
                      <NumberField label="CB 1TR" value={form.planProdCb1tr} onChange={(value) => updateField("planProdCb1tr", value)} />
                      <NumberField label="CB 2TR" value={form.planProdCb2tr} onChange={(value) => updateField("planProdCb2tr", value)} />
                      <NumberField label="CR 1TR" value={form.planProdCr1tr} onChange={(value) => updateField("planProdCr1tr", value)} />
                      <NumberField label="Cam 01" value={form.planProdCam01} onChange={(value) => updateField("planProdCam01", value)} />
                      <NumberField label="Cam 02" value={form.planProdCam02} onChange={(value) => updateField("planProdCam02", value)} />
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : editingId ? "Update Planning" : "Tambah Planning"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
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
        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-sky-500"
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
          className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-12 text-sm outline-none transition focus:border-sky-500"
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

function ReadOnlyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-slate-900">{label}:</span> {value}
    </div>
  );
}

function TableHead({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <th className={`border-b border-slate-200 px-4 py-3 text-left font-semibold whitespace-nowrap ${className ?? ""}`}>
      {label}
    </th>
  );
}

function TableCell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return <td className={`border-b border-slate-200 px-4 py-3 text-slate-700 ${className ?? ""}`}>{value}</td>;
}

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildEmptyForm(tanggal = getTodayInputValue()): PlanningFormValues {
  return {
    tanggal,
    shift: "",
    dayNight: getDefaultDayNightByTime(),
    stockAwalJunbikiCb1tr: 0,
    stockAwalJunbikiCb2tr: 0,
    stockAwalEmergencyCb1tr: 0,
    stockAwalEmergencyCb2tr: 0,
    stockAwalEmergencyCr1tr: 0,
    stockAwalEmergencyCam01: 0,
    stockAwalEmergencyCam02: 0,
    planProdCb1tr: 0,
    planProdCb2tr: 0,
    planProdCr1tr: 0,
    planProdCam01: 0,
    planProdCam02: 0,
    remarks: "",
  };
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`text-lg font-bold text-slate-900 ${valueClassName ?? ""}`}>{formatNumber(value)}</p>
    </div>
  );
}
