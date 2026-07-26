import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { outputFolder: "../playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/tomatin-code-lab/beta/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4173/tomatin-code-lab/beta/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
