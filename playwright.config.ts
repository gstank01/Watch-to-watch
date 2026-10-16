import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_PORT = Number(process.env.MOCK_TMDB_PORT ?? 4010);

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
      command: `npx next start -p ${PORT}`,
      port: PORT,
      env: {
        TMDB_API_TOKEN: "e2e-token",
        TMDB_API_BASE_URL: `http://localhost:${MOCK_PORT}/3`,
        DEFAULT_REGION: "GB",
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
