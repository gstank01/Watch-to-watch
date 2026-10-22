import { expect, test, type Page } from "@playwright/test";
import { accountsEnabled, newEmail, signIn } from "./accounts";
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
    await expect(disney.getByTestId("this-month")).toContainText("Not used in");
    // Saving to an account is only offered when signed in.
    await expect(page.getByLabel("Save my usage to my account")).toHaveCount(0);

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

test.describe("Saving usage to the account", () => {
  test.skip(!accountsEnabled, "Set E2E_DATABASE_URL to run the accounts tests");

  test("is opt-in, follows you to another device, and turning it off deletes it", async ({
    page,
    browser,
  }) => {
    const email = newEmail();
    const usage = async (p: Page) => (await p.request.get("/api/usage")).json();

    await page.goto("/services");
    await page.getByRole("checkbox", { name: "Disney Plus" }).check();
    await signIn(page, email);
    await page.goto("/services");
    const save = page.getByLabel("Save my usage to my account");
    await expect(save).not.toBeChecked();
    expect(await usage(page)).toEqual({ enabled: false });

    await save.check();
    await expect(page.getByText("Your usage is now saved to your account.")).toBeAttached();
    await card(page, "Disney Plus")
      .getByRole("button", { name: "I used it today – Disney Plus" })
      .click();
    const price = page.getByLabel("What you pay a month for Disney Plus");
    await price.fill("7.99");
    await price.press("Tab");
    await expect
      .poll(async () => {
        const body = await usage(page);
        return [body.enabled, Object.keys(body.days), body.prices];
      })
      .toEqual([true, ["337"], { "GB:337": 7.99 }]);

    // A second device with nothing saved picks it all up.
    const other = await browser.newContext();
    const page2 = await other.newPage();
    await signIn(page2, email);
    await page2.goto("/services");
    const disney2 = card(page2, "Disney Plus");
    await expect(page2.getByLabel("Save my usage to my account")).toBeChecked();
    await expect(
      disney2.getByRole("button", { name: "I used it today – Disney Plus" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(disney2.getByTestId("this-month")).toContainText("Used on 1 day in");
    await page2.reload();
    await expect(page2.getByLabel("What you pay a month for Disney Plus")).toHaveValue("7.99");

    // Turning it off deletes the account's copy; this browser keeps its own.
    page2.on("dialog", (dialog) => void dialog.accept());
    await page2.getByLabel("Save my usage to my account").uncheck();
    await expect.poll(async () => usage(page2)).toEqual({ enabled: false });
    await page.reload();
    await expect(page.getByLabel("Save my usage to my account")).not.toBeChecked();
    await expect(
      card(page, "Disney Plus").getByRole("button", { name: "I used it today – Disney Plus" }),
    ).toHaveAttribute("aria-pressed", "true");
    await other.close();
  });
});

test.describe("My usage", () => {
  test("shows each service month by month, with what each day cost", async ({ page }) => {
    await seedCheckup(page, { "GB:8": 10, "GB:337": 7.99 });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name: "My usage" })
      .click();
    await expect(page).toHaveURL(/\/usage$/);
    await expect(page.getByRole("heading", { name: "My usage" })).toBeVisible();

    // Netflix was used on 5 of the last 30 days; Disney Plus not at all.
    const summary = page.getByTestId("usage-summary");
    await expect(summary).toContainText("You pay a month£17.99");
    const netflix = page.getByRole("row", { name: /Netflix/ });
    await expect(netflix).toContainText("£2.00 (£10.00 ÷ 5 days)");
    await expect(page.getByRole("row", { name: /Disney Plus/ })).toContainText("Not used");
    await expect(page.getByRole("row", { name: /BBC iPlayer/ })).toContainText("Free");
    await expect(page.getByText("This usage is kept in this browser only.")).toBeVisible();
  });

  test("points to My services when no services are ticked", async ({ page }) => {
    await page.goto("/usage");
    await expect(page.getByText(/Tick the services you have on/)).toBeVisible();
  });
});
