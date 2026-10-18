import { expect, test, type Page } from "@playwright/test";
import { seedCheckup } from "./seed";

const card = (page: Page, name: string) =>
  page.getByRole("list", { name: "Check-up for your services" }).getByRole("listitem", { name });

test.describe("Service check-up", () => {
  test.beforeEach(async ({ context }) => {
    // "Watch on" opens the real service in a new tab; keep tests off the internet.
    await context.route(/^https:\/\//, (route) =>
      route.fulfill({ contentType: "text/plain", body: "A streaming service" }),
    );
  });

  test("pressing Watch on one of your services counts as using it today", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: /^Check-up/ })).toBeHidden();
    await page.getByRole("checkbox", { name: "Disney Plus" }).check();

    const disney = card(page, "Disney Plus");
    await expect(disney.getByTestId("verdict")).toHaveText("Too early to tell");
    await expect(disney).toContainText("We've been counting for 1 day. Check back in 13 days.");
    const usedToday = disney.getByRole("button", { name: "I used it today – Disney Plus" });
    await expect(usedToday).toHaveAttribute("aria-pressed", "false");

    await page.goto("/tv/136315");
    const popup = page.waitForEvent("popup");
    await page.getByRole("link", { name: /^Open Disney Plus/ }).click();
    await (await popup).close();

    await page.goto("/services");
    await expect(usedToday).toHaveAttribute("aria-pressed", "true");
    await usedToday.click();
    await expect(usedToday).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Took back today for Disney Plus.")).toBeAttached();
  });

  test("suggests what to keep and pause, and adds up the savings", async ({ page }) => {
    await seedCheckup(page);
    await page.goto("/services");

    await expect(page.getByTestId("summary")).toContainText(
      "1 of your 2 paid services could be worth pausing.",
    );
    // Most useful first.
    const cards = page
      .getByRole("list", { name: "Check-up for your services" })
      .getByRole("listitem");
    await expect(cards.getByRole("heading")).toHaveText(["Disney Plus", "Netflix", "BBC iPlayer"]);

    const disney = card(page, "Disney Plus");
    await expect(disney.getByTestId("verdict")).toHaveText("Watch The Bear, then pause it");
    await expect(disney).toContainText("You haven't used it in the last 30 days.");
    await expect(disney).toContainText(
      "The Bear from your Want to watch list is only on Disney Plus.",
    );
    const netflix = card(page, "Netflix");
    await expect(netflix.getByTestId("verdict")).toHaveText("Keep it");
    await expect(netflix).toContainText("You used it on 5 days in the last 30 days.");
    await expect(card(page, "BBC iPlayer").getByTestId("verdict")).toHaveText(
      "Free: nothing to cancel",
    );

    // Prices: savings only count what's flagged.
    const disneyPrice = page.getByLabel("What you pay a month for Disney Plus");
    await disneyPrice.fill("7.99");
    await disneyPrice.press("Tab");
    await expect(disney).toContainText("Pausing it would save £7.99 a month.");
    const netflixPrice = page.getByLabel("What you pay a month for Netflix");
    await netflixPrice.fill("ten pounds");
    await netflixPrice.press("Tab");
    await expect(netflix.getByText("Enter an amount like 10.99.")).toBeVisible();
    await expect(netflixPrice).toHaveAttribute("aria-invalid", "true");
    await netflixPrice.fill("£12.99");
    await netflixPrice.press("Enter");
    await expect(netflixPrice).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByTestId("summary")).toContainText(
      "You pay £20.98 a month (£251.76 a year) for the 2 services you've priced. " +
        "Pausing the one we've flagged could save £7.99 a month.",
    );

    // Watched The Bear: nothing left that needs Disney Plus.
    await page.goto("/tv/136315");
    await page
      .getByRole("group", { name: "The Bear: my list" })
      .getByRole("button", { name: "Watched" })
      .click();
    await page.goto("/services");
    await expect(disney.getByTestId("verdict")).toHaveText("Consider pausing");
    await expect(disney).toContainText("Nothing on your Want to watch list is on Disney Plus.");
    // Prices are kept.
    await expect(page.getByLabel("What you pay a month for Disney Plus")).toHaveValue("7.99");
  });

  test("counting can be forgotten or turned off", async ({ page }) => {
    await seedCheckup(page);
    await page.goto("/services");
    page.on("dialog", (dialog) => void dialog.accept());
    const netflix = card(page, "Netflix");
    await expect(netflix.getByTestId("verdict")).toHaveText("Keep it");

    await page.getByRole("button", { name: "Forget counted days" }).click();
    await expect(netflix.getByTestId("verdict")).toHaveText("Too early to tell");

    await page.getByRole("button", { name: "Turn counting off" }).click();
    await expect(
      page.getByText("Counting is off, so we can't tell which services you use."),
    ).toBeVisible();

    // Nothing is counted while it's off.
    await page.goto("/movie/116149");
    const popup = page.waitForEvent("popup");
    await page.getByRole("link", { name: /^Watch on Netflix/ }).click();
    await (await popup).close();
    await page.goto("/services");
    await page.getByRole("button", { name: "Turn counting on" }).click();
    await expect(
      netflix.getByRole("button", { name: "I used it today – Netflix" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
