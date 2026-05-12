import { defineConfig, devices } from "@playwright/test";
import { loadBlackboxTestEnv } from "./tests/e2e/test-env";

const testEnv = loadBlackboxTestEnv();

const port = Number(process.env.PORT || 3100);
const baseURL = testEnv.NEXTAUTH_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "test",
      NEXTAUTH_URL: baseURL,
      DATABASE_URL: testEnv.DATABASE_URL,
      AUTH_SECRET: testEnv.AUTH_SECRET,
      BLACKBOX_ALLOW_DB_RESET: "1",
      NEXT_DIST_DIR: ".next-blackbox",
    },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
