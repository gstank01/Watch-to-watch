import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_PORT = Number(process.env.MOCK_TMDB_PORT ?? 4010);
// One id per run, shared with the test workers (they inherit the environment).
process.env.E2E_RUN_ID ??= String(Date.now());
const RUN_ID = process.env.E2E_RUN_ID;
// Next.js keeps fetched responses in .next/cache between runs. A per-run path
// (the mock answers under any prefix) keeps one run's cached mock data out of the next.
const MOCK_TMDB_URL = `http://localhost:${MOCK_PORT}/run-${RUN_ID}/3`;
export const UNCONFIGURED_PORT = PORT + 1;

/**
 * Accounts tests need Postgres: set E2E_DATABASE_URL (CI does). Without it they're
 * skipped and the app runs browser-only. Sign-in emails go to this folder.
 */
const DATABASE_URL = process.env.E2E_DATABASE_URL;
export const EMAIL_OUTBOX = path.resolve(".e2e-outbox", RUN_ID);

/**
 * End-to-end tests run the production build against a mock TMDB API (see
 * tests/mocks). Run `npm run build` first.
 *
 * Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a preinstalled Chromium instead of
 * Playwright's bundled browser.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
      },
    },
  ],
  webServer: [
    {
      command: "npm run mock-tmdb",
      port: MOCK_PORT,
      env: { MOCK_TMDB_PORT: String(MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: DATABASE_URL
        ? `npx prisma migrate deploy && npx next start -p ${PORT}`
        : `npx next start -p ${PORT}`,
      port: PORT,
      env: {
        TMDB_API_TOKEN: "e2e-token",
        TMDB_API_BASE_URL: MOCK_TMDB_URL,
        DEFAULT_REGION: "GB",
        ...(DATABASE_URL && {
          DATABASE_URL,
          AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
          AUTH_URL: `http://localhost:${PORT}`,
          EMAIL_TEST_OUTBOX: EMAIL_OUTBOX,
        }),
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Misconfigured on purpose (no TMDB token) for tests/e2e/setup-problems.spec.ts.
      command: `npx next start -p ${UNCONFIGURED_PORT}`,
      port: UNCONFIGURED_PORT,
      // Also no accounts, so the "not set up" messages can be checked.
      env: {
        TMDB_API_TOKEN: "",
        TMDB_API_BASE_URL: MOCK_TMDB_URL,
        DATABASE_URL: "",
        AUTH_SECRET: "",
        AUTH_URL: "",
        EMAIL_TEST_OUTBOX: "",
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
