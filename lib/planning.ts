import type { DailyPlanning } from "@prisma/client";

export type DailyPlanningInput = {
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
  remarks: string;
};

export function normalizePlanningPayload(body: unknown): DailyPlanningInput {
  const payload = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};

  return {
    tanggal: normalizeDateInput(payload.tanggal),
    shift: normalizeText(payload.shift).toUpperCase(),
    dayNight: normalizeText(payload.dayNight).toUpperCase(),
    stockAwalJunbikiCb1tr: normalizeInteger(payload.stockAwalJunbikiCb1tr),
    stockAwalJunbikiCb2tr: normalizeInteger(payload.stockAwalJunbikiCb2tr),
    stockAwalEmergencyCb1tr: normalizeInteger(payload.stockAwalEmergencyCb1tr),
    stockAwalEmergencyCb2tr: normalizeInteger(payload.stockAwalEmergencyCb2tr),
    stockAwalEmergencyCr1tr: normalizeInteger(payload.stockAwalEmergencyCr1tr),
    stockAwalEmergencyCam01: normalizeInteger(payload.stockAwalEmergencyCam01),
    stockAwalEmergencyCam02: normalizeInteger(payload.stockAwalEmergencyCam02),
    planProdCb1tr: normalizeInteger(payload.planProdCb1tr),
    planProdCb2tr: normalizeInteger(payload.planProdCb2tr),
    planProdCr1tr: normalizeInteger(payload.planProdCr1tr),
    planProdCam01: normalizeInteger(payload.planProdCam01),
    planProdCam02: normalizeInteger(payload.planProdCam02),
    remarks: normalizeText(payload.remarks),
  };
}

export function validatePlanningInput(input: DailyPlanningInput) {
  if (!input.tanggal) {
    return "Tanggal wajib diisi";
  }

  if (!input.shift) {
    return "Shift wajib diisi";
  }

  if (!input.dayNight) {
    return "Day / Night wajib diisi";
  }

  return null;
}

export function createPlanId(tanggal: string, shift: string) {
  return `PLAN-${tanggal.replaceAll("-", "")}-${shift}`;
}

export function toPlanningPrismaData(input: DailyPlanningInput) {
  return {
    tanggal: new Date(`${input.tanggal}T00:00:00.000Z`),
    shift: input.shift,
    dayNight: input.dayNight || null,
    stockAwalJunbikiCb1tr: input.stockAwalJunbikiCb1tr,
    stockAwalJunbikiCb2tr: input.stockAwalJunbikiCb2tr,
    stockAwalEmergencyCb1tr: input.stockAwalEmergencyCb1tr,
    stockAwalEmergencyCb2tr: input.stockAwalEmergencyCb2tr,
    stockAwalEmergencyCr1tr: input.stockAwalEmergencyCr1tr,
    stockAwalEmergencyCam01: input.stockAwalEmergencyCam01,
    stockAwalEmergencyCam02: input.stockAwalEmergencyCam02,
    planProdCb1tr: input.planProdCb1tr,
    planProdCb2tr: input.planProdCb2tr,
    planProdCr1tr: input.planProdCr1tr,
    planProdCam01: input.planProdCam01,
    planProdCam02: input.planProdCam02,
    remarks: input.remarks || null,
  };
}

export function planningRecordToClient(record: DailyPlanning) {
  return {
    planId: record.planId,
    tanggal: record.tanggal.toISOString().slice(0, 10),
    shift: record.shift,
    dayNight: record.dayNight ?? "",
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
    inputBy: record.inputBy ?? "",
    inputAt: record.inputAt ? record.inputAt.toISOString().slice(0, 16) : "",
    remarks: record.remarks ?? "",
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return 0;
}
