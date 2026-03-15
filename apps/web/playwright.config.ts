import { defineConfig, devices } from "@playwright/test";

/** 未指定時は本番URL（ローカルはSupabase対象外のためE2Eは本番向け） */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://life-exam-wkot.vercel.app";
const isLocal = baseURL.startsWith("http://localhost") || baseURL.startsWith("http://127.0.0.1");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 120000,
  webServer: isLocal
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60000 }
    : undefined,
});
