import { expect, test } from "@playwright/test";
import { expectMenu, login } from "./helpers";

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/ordering");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fordering/);
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email@company.com").fill("ordering@test.local");
  await page.getByPlaceholder("Masukkan password").fill("wrong-password");
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page.getByText("Email atau password tidak valid")).toBeVisible();
});

test("does not follow external callback URLs after login", async ({ page }) => {
  await page.goto(`/login?callbackUrl=${encodeURIComponent("https://example.com/phish")}`);
  await page.getByPlaceholder("email@company.com").fill("ordering@test.local");
  await page.getByPlaceholder("Masukkan password").fill("Passw0rd!23");
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("shows admin navigation", async ({ page }) => {
  await login(page, "admin");
  const sidebar = page.locator("aside");
  await expectMenu(
    page,
    ["Home", "Analysis", "Planning", "Ordering", "Recap", "Stock", "Delivery", "Receiving", "Tracking", "Users"],
    []
  );
  await expect(sidebar.getByText("Overview", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Fulfillment", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Admin", { exact: true })).toBeVisible();
});

test("shows ordering navigation and hides restricted menus", async ({ page }) => {
  await login(page, "ordering");
  const sidebar = page.locator("aside");
  await expectMenu(
    page,
    ["Home", "Analysis", "Planning", "Ordering", "Recap", "Stock", "Tracking"],
    ["Delivery", "Receiving", "Users"]
  );
  await expect(sidebar.getByText("Overview", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("Fulfillment", { exact: true })).toHaveCount(0);
});

test("enforces role guard for restricted pages", async ({ page }) => {
  await login(page, "delivery");
  await page.goto("/planning");
  await expect(page).toHaveURL(/\/\?unauthorized=1/);

  await page.goto("/users");
  await expect(page).toHaveURL(/\/\?unauthorized=1/);
});

test("returns 401 for unauthenticated API requests", async ({ request }) => {
  const response = await request.get("/api/tracking");
  expect(response.status()).toBe(401);
});
