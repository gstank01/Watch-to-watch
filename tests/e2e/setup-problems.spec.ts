import { expect, test } from "@playwright/test";
import { UNCONFIGURED_PORT } from "../../playwright.config";

// This server runs without TMDB_API_TOKEN, a common first-run mistake.
test.use({ baseURL: `http://localhost:${UNCONFIGURED_PORT}` });

const MISSING_TOKEN = /Site setup problem: the server has no TMDB API token/;

test("pages explain a missing TMDB token instead of failing silently", async ({ page }) => {
  await page.goto("/services");
  await expect(page.getByRole("status")).toHaveText(MISSING_TOKEN);

  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(MISSING_TOKEN);

  await page.goto("/tv/136315");
  await expect(page.getByRole("status")).toHaveText(MISSING_TOKEN);

  await page.goto("/search?q=bear");
  await expect(page.getByRole("status")).toHaveText(MISSING_TOKEN);
});
