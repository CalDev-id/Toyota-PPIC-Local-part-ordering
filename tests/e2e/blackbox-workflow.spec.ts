import { expect, test } from "@playwright/test";
import { login, todayPlus } from "./helpers";

async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open profile card" }).click();
  await page.getByRole("button", { name: /^logout$/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("runs planning to ordering to delivery to receiving workflow", async ({ page }) => {
  const date = todayPlus(10);
  const shift = "WHITE";
  const dayNight = "DAY";

  await login(page, "ordering");

  const invalidOrder = await page.request.post("/api/ordering/pallet", { data: {} });
  expect(invalidOrder.status()).toBe(400);

  const planning = await page.request.post("/api/planning", {
    data: {
      tanggal: date,
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
      remarks: "E2E planning",
    },
  });
  expect(planning.status()).toBe(201);

  const createOrder = await page.request.post("/api/ordering/pallet", {
    data: {
      tanggalOrder: date,
      shift,
      dayNight,
      ritaseRequest: 1,
      remarksOrdering: "E2E pallet order",
      items: [
        { itemCode: "CB_1TR", qtyOrder: 6 },
        { itemCode: "CB_2TR", qtyOrder: 4 },
        { itemCode: "CR_1TR", qtyOrder: 2 },
      ],
    },
  });
  expect(createOrder.status()).toBe(201);

  const created = (await createOrder.json()) as { orderId: string; kodeOrder: string };
  expect(created.orderId).toBeTruthy();
  expect(created.kodeOrder).toMatch(/^ORD-/);

  const submittedTracking = await page.request.get(`/api/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  expect(submittedTracking.status()).toBe(200);
  let tracking = await submittedTracking.json();
  let row = tracking.rows.find((item: { orderId: string }) => item.orderId === created.orderId);
  expect(row).toMatchObject({
    statusOrder: "Submitted",
    totalOrder: 12,
    totalConfirmed: 0,
    totalReceived: 0,
  });

  await page.goto(`/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  await expect(page.getByText(created.kodeOrder)).toBeVisible();

  await logout(page);
  await login(page, "delivery");

  const forbiddenForDelivery = await page.request.post("/api/planning", {
    data: { tanggal: todayPlus(11), shift, dayNight },
  });
  expect(forbiddenForDelivery.status()).toBe(403);

  const confirmDelivery = await page.request.put(`/api/delivery/${created.orderId}/confirm`, {
    data: {
      deliveryNote: "DN-E2E",
      remarksDelivery: "E2E delivery confirmed",
      items: [
        { itemCode: "CB_1TR", qtyConfirm: 6 },
        { itemCode: "CB_2TR", qtyConfirm: 4 },
        { itemCode: "CR_1TR", qtyConfirm: 2 },
      ],
      selected_shells: [],
    },
  });
  expect(confirmDelivery.status()).toBe(200);

  const confirmedTracking = await page.request.get(`/api/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  tracking = await confirmedTracking.json();
  row = tracking.rows.find((item: { orderId: string }) => item.orderId === created.orderId);
  expect(row).toMatchObject({
    statusOrder: "Confirmed",
    totalConfirmed: 12,
    totalReceived: 0,
  });

  await logout(page);
  await login(page, "receiving");

  const checkReceiving = await page.request.put(`/api/receiving/${created.orderId}/check`, {
    data: {
      items: [
        { itemCode: "CB_1TR", qtyReceived: 6, remarksDelivery: "OK" },
        { itemCode: "CB_2TR", qtyReceived: 4, remarksDelivery: "OK" },
        { itemCode: "CR_1TR", qtyReceived: 2, remarksDelivery: "OK" },
      ],
    },
  });
  expect(checkReceiving.status()).toBe(200);

  const checkedTracking = await page.request.get(`/api/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  tracking = await checkedTracking.json();
  row = tracking.rows.find((item: { orderId: string }) => item.orderId === created.orderId);
  expect(row).toMatchObject({
    statusOrder: "Checked",
    totalOrder: 12,
    totalConfirmed: 12,
    totalReceived: 12,
  });

  await page.goto(`/tracking?date=${date}&shift=${shift}&dayNight=${dayNight}`);
  await expect(page.getByText(created.kodeOrder)).toBeVisible();
  await expect(page.getByText("Checked").first()).toBeVisible();
});
