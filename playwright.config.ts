import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/playwright-report.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADFUL ? false : true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testMatch: /tests\/api\/.*\.spec\.(ts|js)/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e",
      testMatch: /tests\/e2e\/.*\.spec\.(ts|js)/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev:server",
      url: `http://127.0.0.1:4545/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
