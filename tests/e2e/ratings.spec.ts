import { expect, test, type Page } from "@playwright/test";
import { THROWAWAY_FROM } from "../mocks/handlers";
import { accountsEnabled, newEmail, signIn } from "./accounts";

const ratingGroup = (page: Page, title: string) =>
  page.getByRole("group", { name: `Your rating for ${title}` });

test.describe("Ratings", () => {
  test("rate a film with stars, change it with the keyboard, and clear it", async ({ page }) => {
    await page.goto("/movie/116149");
    await expect(page.getByText("TMDB 7.2/10")).toBeVisible();
    const stars = ratingGroup(page, "Paddington");

    await stars.getByRole("radio", { name: "4 stars" }).check();
    await expect(stars.getByRole("radio", { name: "4 stars" })).toBeChecked();
    await expect(page.getByText("Rated Paddington 4 stars.")).toBeVisible();

    // Arrow keys move between stars, like any radio group.
    await page.keyboard.press("ArrowRight");
    await expect(stars.getByRole("radio", { name: "5 stars" })).toBeChecked();

    // Saved in the browser.
    await page.reload();
    await expect(
      ratingGroup(page, "Paddington").getByRole("radio", { name: "5 stars" }),
    ).toBeChecked();

    await ratingGroup(page, "Paddington")
      .getByRole("button", { name: "Clear your rating for Paddington" })
      .click();
    await expect(page.getByText("Cleared your rating for Paddington.")).toBeVisible();
    await expect(ratingGroup(page, "Paddington").getByRole("radio", { checked: true })).toHaveCount(
      0,
    );
  });

  test("rate what you've watched from My list", async ({ page }) => {
    await page.goto("/tv/136315");
    await page
      .getByRole("group", { name: "The Bear: my list" })
      .getByRole("button", { name: "Watched" })
      .click();
    await page.goto("/my-list?list=watched");
    await ratingGroup(page, "The Bear").getByRole("radio", { name: "3 stars" }).check();
    await expect(page.getByText("Rated The Bear 3 stars.")).toBeVisible();

    await page.goto("/tv/136315");
    await expect(
      ratingGroup(page, "The Bear").getByRole("radio", { name: "3 stars" }),
    ).toBeChecked();
  });
});

test.describe("Community rating", () => {
  test.skip(!accountsEnabled, "Set E2E_DATABASE_URL to run the accounts tests");

  test("appears once three signed-in users have rated", async ({ browser }) => {
    // A film nobody else rates, so other tests and earlier runs can't change the average.
    const id = THROWAWAY_FROM + Math.floor(Math.random() * 99_000);
    const title = `Test Film ${id}`;
    const community = (page: Page) => page.getByTestId("community-rating");

    for (const [i, stars] of [5, 4, 3].entries()) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await signIn(page, newEmail());
      await page.goto(`/movie/${id}`);
      if (i < 2) await expect(community(page)).toHaveText("WhatToWatch: not enough ratings yet");
      await ratingGroup(page, title)
        .getByRole("radio", { name: `${stars} stars` })
        .check();
      // Wait until the rating has reached the account.
      await expect
        .poll(
          async () =>
            (await (await page.request.get("/api/watchlist")).json()).entries?.[0]?.rating,
        )
        .toBe(stars);
      if (i === 2) {
        await page.reload();
        await expect(community(page)).toHaveText("WhatToWatch ★ 4.0/5 from 3 ratings");
      }
      await context.close();
    }
  });
});
