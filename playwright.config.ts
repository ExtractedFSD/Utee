import { defineConfig } from "@playwright/test";
import { loadEnv } from "./e2e/env";

loadEnv();

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

/**
 * End-to-end suite. Drives the real UI in Chromium against a running portal
 * and the Supabase project named in .env.local. See README → "Testing end
 * to end". Everything it creates uses @e2e.invalid emails and is deleted in
 * global teardown (set E2E_KEEP=1 to keep the data for inspection).
 */
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  // The journeys share a database and walk one kit through every role, so
  // run files one at a time; steps inside a file are serial by design.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Journeys walk one kit through every role and, on a dev server, wait on
  // first-time page compiles; give them room.
  timeout: 600_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Honour an outbound proxy (some CI / sandbox environments route all
    // traffic through one). Node picks it up itself; Chromium needs telling.
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: process.env.NO_PROXY }
      : undefined,
  },
  webServer: isLocal
    ? {
        command: "npm run dev",
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
