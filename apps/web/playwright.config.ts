import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.browser.test.ts",
  fullyParallel: true,
  reporter: "line",
  outputDir: join(tmpdir(), "m199-page-playwright"),
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: {
    baseURL: "http://127.0.0.1:4322",
    trace: "off",
    screenshot: "off",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "pnpm exec astro dev --host 127.0.0.1 --port 4322",
    port: 4322,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ASTRO_API_BASE_URL: "http://127.0.0.1:9",
      ASTRO_PORT: "4322",
    },
  },
});
