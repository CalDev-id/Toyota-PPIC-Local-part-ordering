import "dotenv/config";
import { prisma } from "../lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";

type CsvRow = Record<string, string>;

const csvPaths = {
  dailyPlanning:
    process.env.DAILY_PLANNING_CSV_PATH || path.resolve("/Users/cal/Downloads/Daily_Planning.csv"),
  orderHeader:
    process.env.ORDER_HEADER_CSV_PATH || path.resolve("/Users/cal/Downloads/Order_Header.csv"),
  orderDetail:
    process.env.ORDER_DETAIL_CSV_PATH || path.resolve("/Users/cal/Downloads/Order_Detail.csv"),
};

async function main() {
  const [dailyPlanningRows, orderHeaderRows, orderDetailRows] = await Promise.all([
    readCsv(csvPaths.dailyPlanning),
    readCsv(csvPaths.orderHeader),
    readCsv(csvPaths.orderDetail),
  ]);

  const filteredOrderHeaders = orderHeaderRows.filter(
    (row) => !row.order_id.trim().toUpperCase().startsWith("STAW-")
  );
  const allowedOrderIds = new Set(filteredOrderHeaders.map((row) => row.order_id.trim()));
  const filteredOrderDetails = deduplicateRows(
    orderDetailRows.filter((row) => allowedOrderIds.has(row.order_id.trim())),
    "detail_id"
  );

  await prisma.orderDetail.deleteMany();
  await prisma.orderHeader.deleteMany();
  await prisma.dailyPlanning.deleteMany();

  if (dailyPlanningRows.length > 0) {
    await prisma.dailyPlanning.createMany({
      data: dailyPlanningRows.map((row) => ({
        planId: row.plan_id.trim(),
        tanggal: new Date(`${row.tanggal.trim()}T00:00:00.000Z`),
        shift: row.shift.trim().toUpperCase(),
        dayNight: normalizeNullableText(row.day_night, true),
        stockAwalJunbikiCb1tr: parseInteger(row.stock_awal_junbiki_cb_1tr || row.stock_awal_cb_1tr),
        stockAwalJunbikiCb2tr: parseInteger(row.stock_awal_junbiki_cb_2tr || row.stock_awal_cb_2tr),
        stockAwalEmergencyCb1tr: parseInteger(row.stock_awal_emergency_cb_1tr),
        stockAwalEmergencyCb2tr: parseInteger(row.stock_awal_emergency_cb_2tr),
        stockAwalEmergencyCr1tr: parseInteger(row.stock_awal_emergency_cr_1tr || row.stock_awal_cr_1tr),
        stockAwalEmergencyCam01: parseInteger(row.stock_awal_emergency_cam_01 || row.stock_awal_cam_01),
        stockAwalEmergencyCam02: parseInteger(row.stock_awal_emergency_cam_02 || row.stock_awal_cam_02),
        planProdCb1tr: parseInteger(row.plan_prod_cb_1tr),
        planProdCb2tr: parseInteger(row.plan_prod_cb_2tr),
        planProdCr1tr: parseInteger(row.plan_prod_cr_1tr),
        planProdCam01: parseInteger(row.plan_prod_cam_01),
        planProdCam02: parseInteger(row.plan_prod_cam_02),
        inputBy: normalizeNullableText(row.input_by, false),
        inputAt: parseDateTime(row.input_at),
        remarks: normalizeNullableText(row.remarks, false),
      })),
    });
  }

  if (filteredOrderHeaders.length > 0) {
    await prisma.orderHeader.createMany({
      data: filteredOrderHeaders.map((row) => ({
        orderId: row.order_id.trim(),
        kodeOrder: row.kode_order.trim(),
        tanggalOrder: new Date(`${row.tanggal_order.trim()}T00:00:00.000Z`),
        waktuOrder: new Date(normalizeDateTimeString(row.waktu_order)),
        shift: row.shift.trim().toUpperCase(),
        dayNight: normalizeNullableText(row.day_night, true),
        truckType: normalizeNullableText(row.truck_type, true),
        ritaseRequest: parseInteger(row.ritase_request),
        statusOrder: normalizeNullableText(row.status_order, false),
        remarksOrdering: normalizeNullableText(row.remarks_ordering, false),
        createdBy: normalizeNullableText(row.created_by, false),
        createdAt: parseDateTime(row.created_at),
        updatedBy: normalizeNullableText(row.updated_by, false),
        updatedAt: parseDateTime(row.updated_at),
      })),
    });
  }

  if (filteredOrderDetails.length > 0) {
    await prisma.orderDetail.createMany({
      data: filteredOrderDetails.map((row) => ({
        detailId: row.detail_id.trim(),
        orderId: row.order_id.trim(),
        itemCode: row.item_code.trim().toUpperCase(),
        itemName: row.item_name.trim(),
        qtyOrder: parseInteger(row.qty_order),
        qtyConfirm: parseInteger(row.qty_confirm),
        qtyReceived: parseInteger(row.qty_received),
        remarksOrdering: normalizeNullableText(row.remarks_ordering, false),
        remarksDelivery: normalizeNullableText(row.remarks_delivery, false),
        lineNo: parseInteger(row.line_no),
        createdAt: parseDateTime(row.created_at),
        updatedAt: parseDateTime(row.updated_at),
      })),
    });
  }

  console.log(
    `Imported ${dailyPlanningRows.length} planning rows, ${filteredOrderHeaders.length} headers, ${filteredOrderDetails.length} details.`
  );
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  const content = await readFile(filePath, "utf8");
  return parseCsv(content);
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      currentValue = "";
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) {
    return [];
  }

  return dataRows.map((row) => {
    const entry: CsvRow = {};

    for (let index = 0; index < headerRow.length; index += 1) {
      entry[headerRow[index]] = row[index] ?? "";
    }

    return entry;
  });
}

function deduplicateRows(rows: CsvRow[], key: string) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const value = row[key]?.trim() || "";
    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function parseInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeNullableText(value: string, uppercase: boolean) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return uppercase ? trimmed.toUpperCase() : trimmed;
}

function parseDateTime(value: string) {
  const normalized = value.trim();
  return normalized ? new Date(normalizeDateTimeString(normalized)) : null;
}

function normalizeDateTimeString(value: string) {
  return value.includes("T") ? value : value.replace(" ", "T");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
