"use client";

import {
  RECAP_DAY_NIGHT_OPTIONS,
  RECAP_FILTER_ALL,
  RECAP_METRIC_CONFIGS,
  RECAP_SHIFT_OPTIONS,
  type RecapFilter,
  type RecapRow,
  type RecapSummary,
} from "@/lib/recap";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import * as XLSX from "xlsx";

type RecapPageClientProps = {
  rows: RecapRow[];
  summary: RecapSummary;
  selectedFilter: RecapFilter;
  errorMessage?: string | null;
};

type RecapTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  group?: "identity" | RecapMetricKey | "total";
  getValue: (row: RecapRow) => string | number;
};

type RecapMetricKey = "cb1tr" | "cb2tr" | "cr1tr" | "cam01" | "cam02";

type ColumnGroup = {
  key: string;
  label: string;
  colSpan: number;
  className: string;
};

const metricLabels = ["Stock", "Plan", "Request", "Delivery", "Received", "Gap"];
const metricGroupClassNames: Record<RecapMetricKey, string> = {
  cb1tr: "bg-white",
  cb2tr: "bg-slate-50/80",
  cr1tr: "bg-white",
  cam01: "bg-slate-50/80",
  cam02: "bg-white",
};
const metricHeaderClassNames: Record<RecapMetricKey, string> = {
  cb1tr: "bg-emerald-50 text-emerald-900",
  cb2tr: "bg-sky-50 text-sky-900",
  cr1tr: "bg-amber-50 text-amber-900",
  cam01: "bg-violet-50 text-violet-900",
  cam02: "bg-rose-50 text-rose-900",
};

const columnGroups: ColumnGroup[] = [
  { key: "identity", label: "Informasi", colSpan: 3, className: "bg-slate-100 text-slate-700" },
  ...RECAP_METRIC_CONFIGS.map((config) => ({
    key: config.key,
    label: config.label,
    colSpan: metricLabels.length,
    className: metricHeaderClassNames[config.key],
  })),
  { key: "total", label: "Total", colSpan: 4, className: "bg-slate-900 text-white" },
];

const tableColumns: RecapTableColumn[] = [
  { key: "tanggal", label: "Tanggal", group: "identity", getValue: (row) => row.tanggalLabel },
  { key: "shift", label: "Shift", group: "identity", getValue: (row) => row.shift },
  { key: "dayNight", label: "Day/Night", group: "identity", getValue: (row) => row.dayNight },
  ...RECAP_METRIC_CONFIGS.flatMap((config) => [
    {
      key: `${config.key}StockAwal`,
      label: "Stock",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].stockAwal,
    },
    {
      key: `${config.key}Plan`,
      label: "Plan",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].planProd,
    },
    {
      key: `${config.key}Request`,
      label: "Request",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].request,
    },
    {
      key: `${config.key}Delivery`,
      label: "Delivery",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].delivery,
    },
    {
      key: `${config.key}Received`,
      label: "Received",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].received,
    },
    {
      key: `${config.key}Gap`,
      label: "Gap",
      group: config.key,
      align: "right" as const,
      getValue: (row: RecapRow) => row[config.key].gap,
    },
  ]),
  { key: "totalPlan", label: "Plan", group: "total", align: "right", getValue: (row) => row.totalPlan },
  { key: "totalRequest", label: "Request", group: "total", align: "right", getValue: (row) => row.totalRequest },
  { key: "totalDelivery", label: "Delivery", group: "total", align: "right", getValue: (row) => row.totalDelivery },
  { key: "totalReceived", label: "Received", group: "total", align: "right", getValue: (row) => row.totalReceived },
];

export default function RecapPageClient({
  rows,
  summary,
  selectedFilter,
  errorMessage,
}: RecapPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(selectedFilter);

  useEffect(() => {
    setFilters(selectedFilter);
  }, [selectedFilter]);

  function pushFilters(nextFilters: RecapFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", nextFilters.month);
    params.set("shift", nextFilters.shift);
    params.set("dayNight", nextFilters.dayNight);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function updateFilter(key: keyof RecapFilter, value: string) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    pushFilters(nextFilters);
  }

  function downloadExcel() {
    if (rows.length === 0) {
      return;
    }

    const worksheetRows = rows.map((row) =>
      Object.fromEntries(tableColumns.map((column) => [getExportColumnLabel(column), column.getValue(row)]))
    );
    const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recap");
    XLSX.writeFile(workbook, buildExcelFileName(filters));
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Recap</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Recap Planning & Ordering</h1>
            <p className="mt-2 text-sm text-slate-600">
              Rekap bulanan planning dan ordering dalam satu tabel gabung.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[760px]">
            <FilterField label="Bulan">
              <MonthField
                name="month"
                value={filters.month}
                onChange={(event) => updateFilter("month", event.target.value)}
              />
            </FilterField>
            <FilterField label="Shift">
              <SelectField
                name="shift"
                value={filters.shift}
                onChange={(event) => updateFilter("shift", event.target.value)}
              >
                {RECAP_SHIFT_OPTIONS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </SelectField>
            </FilterField>
            <FilterField label="Day / Night">
              <SelectField
                name="dayNight"
                value={filters.dayNight}
                onChange={(event) => updateFilter("dayNight", event.target.value)}
              >
                {RECAP_DAY_NIGHT_OPTIONS.map((dayNight) => (
                  <option key={dayNight} value={dayNight}>
                    {dayNight}
                  </option>
                ))}
              </SelectField>
            </FilterField>
            <button
              type="button"
              onClick={downloadExcel}
              disabled={rows.length === 0}
              className="inline-flex h-11 items-center justify-center self-end rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Download Excel
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Order" value={summary.totalRows} />
        <SummaryCard label="Total Plan" value={summary.totalPlan} />
        <SummaryCard label="Total Request" value={summary.totalRequest} />
        <SummaryCard label="Total Delivery" value={summary.totalDelivery} />
        <SummaryCard label="Total Received" value={summary.totalReceived} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Tabel Recap</h2>
          <p className="mt-1 text-sm text-slate-500">
            Filter aktif: {formatMonthLabel(filters.month)} / {filters.shift} / {filters.dayNight}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Belum ada data recap untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="text-slate-700">
                <tr>
                  {columnGroups.map((group) => (
                    <th
                      key={group.key}
                      scope="colgroup"
                      colSpan={group.colSpan}
                      className={`border-b border-r border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap ${group.className}`}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {tableColumns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={getHeaderCellClassName(column)}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="align-top odd:bg-white even:bg-slate-50/60">
                    {tableColumns.map((column) => {
                      const value = column.getValue(row);
                      return (
                      <td
                        key={column.key}
                        className={getBodyCellClassName(column, value)}
                      >
                        {formatCellValue(value)}
                      </td>
                      );
                    })}
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{formatNumber(value)}</p>
    </article>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-700 outline-none transition focus:border-sky-500"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function MonthField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="month"
      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500"
    />
  );
}

function buildExcelFileName(filter: RecapFilter) {
  const shift = filter.shift === RECAP_FILTER_ALL ? "all-shift" : filter.shift.toLowerCase();
  const dayNight = filter.dayNight === RECAP_FILTER_ALL ? "all-daynight" : filter.dayNight.toLowerCase();
  return `recap-${filter.month}-${shift}-${dayNight}.xlsx`;
}

function getExportColumnLabel(column: RecapTableColumn) {
  if (!column.group || column.group === "identity") {
    return column.label;
  }

  if (column.group === "total") {
    return `Total ${column.label}`;
  }

  const metricConfig = RECAP_METRIC_CONFIGS.find((config) => config.key === column.group);
  return `${metricConfig?.label ?? column.group} ${column.label}`;
}

function getHeaderCellClassName(column: RecapTableColumn) {
  const alignClassName = column.align === "right" ? "text-right" : "text-left";
  const groupClassName =
    column.group === "total"
      ? "border-l-2 border-l-slate-300 bg-slate-100"
      : column.group && column.group !== "identity"
        ? metricGroupClassNames[column.group]
        : "bg-white";

  return `border-b border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap ${alignClassName} ${groupClassName}`;
}

function getBodyCellClassName(column: RecapTableColumn, value: string | number) {
  const alignClassName = column.align === "right" ? "text-right tabular-nums" : "text-left";
  const groupClassName =
    column.group === "total"
      ? "border-l-2 border-l-slate-300 bg-slate-100/80 font-semibold text-slate-900"
      : column.group && column.group !== "identity"
        ? metricGroupClassNames[column.group]
        : "bg-white font-medium text-slate-900";
  const valueClassName =
    column.key.toLowerCase().includes("gap") && typeof value === "number"
      ? value < 0
        ? "font-semibold text-rose-600"
        : value > 0
          ? "font-semibold text-emerald-600"
          : "text-slate-500"
      : "text-slate-700";

  return `border-b border-r border-slate-200 px-4 py-3 whitespace-nowrap ${alignClassName} ${groupClassName} ${valueClassName}`;
}

function formatCellValue(value: string | number) {
  return typeof value === "number" ? formatNumber(value) : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
