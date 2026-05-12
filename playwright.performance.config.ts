import { defineConfig, devices } from "@playwright/test";
import { loadBlackboxTestEnv } from "./tests/e2e/test-env";

const testEnv = loadBlackboxTestEnv();

const port = Number(process.env.PORT || 3100);
const baseURL = testEnv.NEXTAUTH_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/performance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    video: "off",
    screenshot: "off",
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
      name: "performance-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
