import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("home and tracking render on mobile viewport", async ({ page }) => {
  await login(page, "admin");

  await expect(page.getByRole("button", { name: "Open sidebar" })).toBeVisible();

  await page.goto("/tracking");
  await expect(page).toHaveURL(/\/tracking/);
  await expect(page.getByText(/tracking/i).first()).toBeVisible();
});
