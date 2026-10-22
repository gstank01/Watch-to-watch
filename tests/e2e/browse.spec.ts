import { expect, test, type Page } from "@playwright/test";

const results = (page: Page) => page.locator('section[aria-labelledby="browse-results"] > ul');
const filters = (page: Page) => page.getByRole("navigation", { name: "Browse filters" });
const chip = (page: Page, group: string, name: string) =>
  filters(page).getByRole("group", { name: group }).getByRole("link", { name, exact: true });

test.describe("Browse", () => {
  test("by category, films or series, and where it streams", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Browse" })
      .click();
    await expect(page.getByRole("heading", { name: "Films in United Kingdom" })).toBeVisible();
    await expect(results(page)).toContainText("Paddington");
    await expect(results(page)).toContainText("The Bear");

    // A category narrows it down, and it's in the URL.
    await chip(page, "Category", "Comedy").click();
    await expect(page).toHaveURL(/\/browse\?genre=35$/);
    await expect(
      page.getByRole("heading", { name: "Comedy films in United Kingdom" }),
    ).toBeVisible();
    await expect(chip(page, "Category", "Comedy")).toHaveAttribute("aria-current", "page");
    await expect(results(page)).toContainText("Paddington");
    await expect(results(page)).not.toContainText("The Bear");

    // Comedy exists for series too, so it's kept when switching.
    await chip(page, "Films or series", "Series").click();
    await expect(
      page.getByRole("heading", { name: "Comedy series in United Kingdom" }),
    ).toBeVisible();
    await expect(results(page)).toContainText("The Bear");

    // Free: Paddington is on BBC iPlayer.
    await chip(page, "Films or series", "Films").click();
    await chip(page, "Where", "Free").click();
    await expect(
      page.getByRole("heading", { name: "Comedy films free to watch in United Kingdom" }),
    ).toBeVisible();
    await expect(results(page)).toContainText("Paddington");
  });

  test("on my services uses the services saved in this browser", async ({ page }) => {
    await page.goto("/browse");
    await expect(chip(page, "Where", "On my services: pick your services first")).toBeVisible();

    await page.goto("/services");
    await page.getByRole("checkbox", { name: "Disney Plus" }).check();
    await page.goto("/browse?type=tv");
    await chip(page, "Where", "On my services").click();
    await expect(page).toHaveURL(/where=mine&services=337/);
    await expect(
      page.getByRole("heading", { name: "Series on your services in United Kingdom" }),
    ).toBeVisible();
    await expect(results(page)).toContainText("The Bear");

    // Films on Disney Plus: none in the sample data.
    await chip(page, "Films or series", "Films").click();
    await expect(page.getByText("Nothing matches these filters right now.")).toBeVisible();
  });
});

test.describe("Home page", () => {
  test("a popular row per service, leaving out what you've watched", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("checkbox", { name: "Netflix" }).check();
    await page.getByRole("checkbox", { name: "Disney Plus" }).check();
    await page.goto("/");
    await expect(page.getByRole("list", { name: "Popular on Netflix" })).toContainText(
      "Paddington",
    );
    await expect(page.getByRole("list", { name: "Popular on Disney Plus" })).toContainText(
      "The Bear",
    );

    await page.goto("/movie/116149");
    await page
      .getByRole("group", { name: "Paddington: my list" })
      .getByRole("button", { name: "Watched" })
      .click();
    await page.goto("/");
    await expect(page.getByText("Nothing new to show on Netflix right now.")).toBeVisible();
  });
});
