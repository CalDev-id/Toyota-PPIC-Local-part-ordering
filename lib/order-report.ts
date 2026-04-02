import { prisma } from "@/lib/prisma";

type TableReference = {
  table_schema: string;
  table_name: string;
};

type OrderReportRowQuery = {
  Tanggal_ORD: string | Date | null;
  Waktu: string | null;
  Kode_Input: string | null;
  CB_1TR: unknown;
  Konf_CB_1TR: unknown;
  CB_2TR: unknown;
  Konf_CB_2TR: unknown;
  Cam_No_01: unknown;
  Konf_Cam_01: unknown;
  Cam_No_02: unknown;
  Konf_Cam_02: unknown;
  CR_1TR: unknown;
  Konf_CR_1TR: unknown;
  Remarks_Junbiki_S2: string | null;
  Remarks_Pallet_S2: string | null;
};

export type OrderMetricKey =
  | "cb1tr"
  | "cb2tr"
  | "camNo01"
  | "camNo02"
  | "cr1tr";

export type OrderMetricPair = {
  order: number;
  delivery: number;
};

export type OrderReportRow = {
  rawDate: string;
  date: string;
  time: string;
  code: string;
  cb1tr: OrderMetricPair;
  cb2tr: OrderMetricPair;
  camNo01: OrderMetricPair;
  camNo02: OrderMetricPair;
  cr1tr: OrderMetricPair;
  remarksJunbikiS2: string;
  remarksPalletS2: string;
  sortDateValue: number;
};

export type OrderItemSummary = {
  key: OrderMetricKey;
  label: string;
  orderTotal: number;
  deliveryTotal: number;
  gap: number;
};

export async function getOrderReportRows(selectedMonth: string): Promise<OrderReportRow[]> {
  const tableRef = await resolveOrderRecordTable();
  const qualifiedTableName = `${quoteIdentifier(tableRef.table_schema)}.${quoteIdentifier(
    tableRef.table_name
  )}`;
  const monthRange = getMonthRange(selectedMonth);

  const rows = await prisma.$queryRawUnsafe<OrderReportRowQuery[]>(
    `
    SELECT
      "Tanggal_ORD",
      "Waktu",
      "Kode_Input",
      "CB_1TR",
      "Konf_CB_1TR",
      "CB_2TR",
      "Konf_CB_2TR",
      "Cam_No_01",
      "Konf_Cam_01",
      "Cam_No_02",
      "Konf_Cam_02",
      "CR_1TR",
      "Konf_CR_1TR",
      "Remarks_Junbiki_S2",
      "Remarks_Pallet_S2"
    FROM ${qualifiedTableName}
    WHERE "Kode_Input" LIKE 'ORD-%'
      AND TO_DATE("Tanggal_ORD", 'DD/MM/YYYY') >= $1::date
      AND TO_DATE("Tanggal_ORD", 'DD/MM/YYYY') < $2::date
    ORDER BY
      TO_DATE("Tanggal_ORD", 'DD/MM/YYYY') DESC,
      "Waktu" DESC,
      "Kode_Input" DESC
  `,
    monthRange.startDate,
    monthRange.endDate
  );

  return rows.map((row) => {
    const sortDate = parseDateValue(row.Tanggal_ORD);

    return {
      rawDate: normalizeRawDate(row.Tanggal_ORD),
      date: formatDateLabel(row.Tanggal_ORD),
      time: normalizeText(row.Waktu),
      code: normalizeText(row.Kode_Input),
      cb1tr: {
        order: toNumber(row.CB_1TR),
        delivery: toNumber(row.Konf_CB_1TR),
      },
      cb2tr: {
        order: toNumber(row.CB_2TR),
        delivery: toNumber(row.Konf_CB_2TR),
      },
      camNo01: {
        order: toNumber(row.Cam_No_01),
        delivery: toNumber(row.Konf_Cam_01),
      },
      camNo02: {
        order: toNumber(row.Cam_No_02),
        delivery: toNumber(row.Konf_Cam_02),
      },
      cr1tr: {
        order: toNumber(row.CR_1TR),
        delivery: toNumber(row.Konf_CR_1TR),
      },
      remarksJunbikiS2: normalizeText(row.Remarks_Junbiki_S2),
      remarksPalletS2: normalizeText(row.Remarks_Pallet_S2),
      sortDateValue: sortDate,
    };
  });
}

export function normalizeMonthFilter(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function buildOrderItemSummaries(rows: OrderReportRow[]): OrderItemSummary[] {
  const configs: Array<{ key: OrderMetricKey; label: string }> = [
    { key: "cb1tr", label: "CB_1TR" },
    { key: "cb2tr", label: "CB_2TR" },
    { key: "camNo01", label: "Cam_No_01" },
    { key: "camNo02", label: "Cam_No_02" },
    { key: "cr1tr", label: "CR_1TR" },
  ];

  return configs.map(({ key, label }) => {
    const totals = rows.reduce(
      (acc, row) => {
        acc.orderTotal += row[key].order;
        acc.deliveryTotal += row[key].delivery;
        return acc;
      },
      { orderTotal: 0, deliveryTotal: 0 }
    );

    return {
      key,
      label,
      orderTotal: totals.orderTotal,
      deliveryTotal: totals.deliveryTotal,
      gap: totals.deliveryTotal - totals.orderTotal,
    };
  });
}

async function resolveOrderRecordTable(): Promise<TableReference> {
  const candidates = await prisma.$queryRawUnsafe<TableReference[]>(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND lower(table_name) = lower('Order_Record')
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY
      CASE WHEN table_schema = 'public' THEN 0 ELSE 1 END,
      table_schema,
      table_name
  `);

  const tableRef = candidates[0];

  if (!tableRef) {
    throw new Error(
      'Tabel Order_Record tidak ditemukan. Cek nama tabel hasil import di PostgreSQL, kemungkinan tersimpan sebagai "order_record" atau di schema selain public.'
    );
  }

  return tableRef;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function getMonthRange(selectedMonth: string) {
  const normalized = normalizeMonthFilter(selectedMonth);
  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    startDate: formatSqlDate(start),
    endDate: formatSqlDate(end),
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const normalized = trimmed.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeText(value: string | null): string {
  return value?.trim() || "-";
}

function normalizeRawDate(value: string | Date | null): string {
  if (value instanceof Date) {
    return formatSqlDate(value);
  }

  return value?.trim() || "-";
}

function parseDateValue(value: string | Date | null): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (!value) {
    return 0;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const [day, month, year] = trimmed.split("/").map(Number);
  if (!day || !month || !year) {
    return 0;
  }

  return new Date(year, month - 1, day).getTime();
}

function formatDateLabel(value: string | Date | null): string {
  const dateValue = parseDateValue(value);

  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function formatSqlDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
