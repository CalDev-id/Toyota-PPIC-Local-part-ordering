import { expect, type Page } from "@playwright/test";

export const testUsers = {
  admin: { email: "admin@test.local", password: "Passw0rd!23" },
  ordering: { email: "ordering@test.local", password: "Passw0rd!23" },
  delivery: { email: "delivery@test.local", password: "Passw0rd!23" },
  receiving: { email: "receiving@test.local", password: "Passw0rd!23" },
} as const;

export async function login(page: Page, role: keyof typeof testUsers, callbackUrl = "/") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByPlaceholder("email@company.com").fill(testUsers[role].email);
  await page.getByPlaceholder("Masukkan password").fill(testUsers[role].password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(callbackUrl)}(?:\\?.*)?$`));
}

export async function expectMenu(page: Page, visible: string[], hidden: string[]) {
  for (const label of visible) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }

  for (const label of hidden) {
    await expect(page.getByRole("link", { name: label })).toHaveCount(0);
  }
}

export function todayPlus(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
