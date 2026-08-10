import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath, URL } from "node:url";

const frontendOnly = process.env.VITE_FRONTEND_ONLY === "true";
const serverUrl = frontendOnly
  ? "http://127.0.0.1:4173/"
  : "http://127.0.0.1:4173/tomatin-code-lab/beta/";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { outputFolder: "../playwright-report", open: "never" }]],
  use: {
    baseURL: serverUrl,
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
    command: frontendOnly ? "pnpm frontend:dev" : "pnpm dev",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: serverUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
