import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { login, todayPlus } from "../e2e/helpers";

const ITERATIONS = 3;
const THRESHOLDS = {
  pageMs: 3_000,
  apiGetMs: 1_500,
  apiWriteMs: 2_000,
  workflowMs: 8_000,
};

type Metric = {
  name: string;
  kind: "page" | "api-get" | "api-write" | "workflow";
  samplesMs: number[];
  medianMs: number;
  thresholdMs: number;
};

const metrics: Metric[] = [];

test.afterAll(() => {
  const summary = {
    generatedAt: new Date().toISOString(),
    thresholds: THRESHOLDS,
    metrics,
  };

  mkdirSync("performance-results", { recursive: true });
  writeFileSync(
    join("performance-results", "perf-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  console.table(
    metrics.map((metric) => ({
      name: metric.name,
      kind: metric.kind,
      medianMs: Math.round(metric.medianMs),
      thresholdMs: metric.thresholdMs,
      samplesMs: metric.samplesMs.map((sample) => Math.round(sample)).join(", "),
    }))
  );
});

test("records authenticated page and API performance baseline", async ({ page }) => {
  const date = todayPlus(20);
  const shift = "WHITE";
  const dayNight = "DAY";

  await freshLogin(page, "admin");

  await measurePage(page, "home", "/");
  await measurePage(page, "ordering", "/ordering");
  await measurePage(page, "delivery", "/delivery");
  await measurePage(page, "receiving", "/receiving");
  await measurePage(page, "tracking", `/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  await measurePage(page, "analysis", "/analysis");
  await measurePage(page, "recap", "/recap");

  await freshLogin(page, "ordering");

  await measureApi("GET /api/planning", "api-get", THRESHOLDS.apiGetMs, () =>
    page.request.get("/api/planning")
  );

  await measureApi("POST /api/planning", "api-write", THRESHOLDS.apiWriteMs, (index) =>
    page.request.post("/api/planning", {
      data: buildPlanningPayload(todayPlus(30 + index), shift, dayNight),
    })
  );

  const workflowSamples: number[] = [];
  const createOrderSamples: number[] = [];
  const confirmDeliverySamples: number[] = [];
  const checkReceivingSamples: number[] = [];
  const trackingSamples: number[] = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    const workflowDate = todayPlus(21 + index);
    const workflowStart = performance.now();

    await timeResponse(() =>
      page.request.post("/api/planning", {
        data: buildPlanningPayload(workflowDate, shift, dayNight),
      })
    );

    const createOrderMeasurement = await timeResponse(() =>
      page.request.post("/api/ordering/pallet", {
        data: buildPalletOrderPayload(workflowDate, shift, dayNight),
      })
    );
    createOrderSamples.push(createOrderMeasurement.durationMs);
    const createOrder = createOrderMeasurement.response;
    const created = (await createOrder.json()) as { orderId: string };

    await freshLogin(page, "delivery");
    const confirmDeliveryMeasurement = await timeResponse(() =>
      page.request.put(`/api/delivery/${created.orderId}/confirm`, {
        data: {
          deliveryNote: `DN-PERF-${index + 1}`,
          remarksDelivery: "Performance delivery confirmed",
          items: buildDeliveryItems(),
          selected_shells: [],
        },
      })
    );
    confirmDeliverySamples.push(confirmDeliveryMeasurement.durationMs);

    await freshLogin(page, "receiving");
    const checkReceivingMeasurement = await timeResponse(() =>
      page.request.put(`/api/receiving/${created.orderId}/check`, {
        data: {
          items: buildReceivingItems(),
        },
      })
    );
    checkReceivingSamples.push(checkReceivingMeasurement.durationMs);

    const trackingMeasurement = await timeResponse(() =>
      page.request.get(`/api/tracking?date=${workflowDate}&shift=${shift}&dayNight=${dayNight}`)
    );
    trackingSamples.push(trackingMeasurement.durationMs);
    const tracking = trackingMeasurement.response;
    const trackingBody = await tracking.json();
    const row = trackingBody.rows.find((item: { orderId: string }) => item.orderId === created.orderId);
    expect(row).toMatchObject({
      statusOrder: "Checked",
      totalOrder: 12,
      totalConfirmed: 12,
      totalReceived: 12,
    });

    workflowSamples.push(performance.now() - workflowStart);
    await freshLogin(page, "ordering");
  }

  recordMetric({
    name: "POST /api/ordering/pallet",
    kind: "api-write",
    samplesMs: createOrderSamples,
    thresholdMs: THRESHOLDS.apiWriteMs,
  });
  recordMetric({
    name: "PUT /api/delivery/:id/confirm",
    kind: "api-write",
    samplesMs: confirmDeliverySamples,
    thresholdMs: THRESHOLDS.apiWriteMs,
  });
  recordMetric({
    name: "PUT /api/receiving/:id/check",
    kind: "api-write",
    samplesMs: checkReceivingSamples,
    thresholdMs: THRESHOLDS.apiWriteMs,
  });
  recordMetric({
    name: "GET /api/tracking",
    kind: "api-get",
    samplesMs: trackingSamples,
    thresholdMs: THRESHOLDS.apiGetMs,
  });
  recordMetric({
    name: "planning-to-receiving workflow",
    kind: "workflow",
    samplesMs: workflowSamples,
    thresholdMs: THRESHOLDS.workflowMs,
  });
});

async function measurePage(page: Page, name: string, path: string) {
  await page.goto(path);
  await expect(page.locator("main")).toBeVisible();

  const samples = await sample(async () => {
    const start = performance.now();
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    return performance.now() - start;
  });

  recordMetric({
    name: `page ${name}`,
    kind: "page",
    samplesMs: samples,
    thresholdMs: THRESHOLDS.pageMs,
  });
}

async function freshLogin(page: Page, role: Parameters<typeof login>[1]) {
  await page.context().clearCookies();
  await login(page, role);
}

async function measureApi(
  name: string,
  kind: "api-get" | "api-write",
  thresholdMs: number,
  requestFn: (index: number) => Promise<APIResponse>
) {
  const response = await requestFn(-1);
  expect(response.ok(), `${name} warm-up/status`).toBe(true);

  const responses: APIResponse[] = [];
  const samples = await sample(async (index) => {
    const measured = await timeResponse(() => requestFn(index));
    responses.push(measured.response);
    return measured.durationMs;
  });

  recordMetric({
    name,
    kind,
    samplesMs: samples,
    thresholdMs,
  });

  return responses.at(-1) ?? response;
}

async function timeResponse(requestFn: () => Promise<APIResponse>) {
  const start = performance.now();
  const response = await requestFn();
  const durationMs = performance.now() - start;
  expect(response.ok(), "API response status").toBe(true);
  return { response, durationMs };
}

async function sample(measure: (index: number) => Promise<number>) {
  const samples: number[] = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    samples.push(await measure(index));
  }

  return samples;
}

function recordMetric(input: Omit<Metric, "medianMs">) {
  const metric = {
    ...input,
    medianMs: median(input.samplesMs),
  };

  metrics.push(metric);
  expect(metric.medianMs, `${metric.name} median`).toBeLessThanOrEqual(metric.thresholdMs);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function buildPlanningPayload(tanggal: string, shift: string, dayNight: string) {
  return {
    tanggal,
    shift,
    dayNight,
    stockAwalJunbikiCb1tr: 0,
    stockAwalJunbikiCb2tr: 0,
    stockAwalEmergencyCb1tr: 0,
    stockAwalEmergencyCb2tr: 0,
    stockAwalEmergencyCr1tr: 0,
    stockAwalEmergencyCam01: 0,
    stockAwalEmergencyCam02: 0,
    planProdCb1tr: 40,
    planProdCb2tr: 30,
    planProdCr1tr: 20,
    planProdCam01: 20,
    planProdCam02: 20,
    remarks: "Performance planning",
  };
}

function buildPalletOrderPayload(tanggalOrder: string, shift: string, dayNight: string) {
  return {
    tanggalOrder,
    shift,
    dayNight,
    ritaseRequest: 1,
    remarksOrdering: "Performance pallet order",
    items: [
      { itemCode: "CB_1TR", qtyOrder: 6 },
      { itemCode: "CB_2TR", qtyOrder: 4 },
      { itemCode: "CR_1TR", qtyOrder: 2 },
    ],
  };
}

function buildDeliveryItems() {
  return [
    { itemCode: "CB_1TR", qtyConfirm: 6 },
    { itemCode: "CB_2TR", qtyConfirm: 4 },
    { itemCode: "CR_1TR", qtyConfirm: 2 },
  ];
}

function buildReceivingItems() {
  return [
    { itemCode: "CB_1TR", qtyReceived: 6, remarksDelivery: "OK" },
    { itemCode: "CB_2TR", qtyReceived: 4, remarksDelivery: "OK" },
    { itemCode: "CR_1TR", qtyReceived: 2, remarksDelivery: "OK" },
  ];
}
