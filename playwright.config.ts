import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const installedBrowser =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  (process.platform === "win32" &&
  existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : undefined);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: installedBrowser ? { executablePath: installedBrowser } : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `"${process.execPath}" scripts/dev.mjs`,
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
