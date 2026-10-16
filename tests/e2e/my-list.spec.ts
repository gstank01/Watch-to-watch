import { expect, test } from "@playwright/test";

test.describe("My list", () => {
  test("favourite a show, track it through the lists, and remove it", async ({ page }) => {
    await page.goto("/tv/136315");
    const actions = page.getByRole("group", { name: "The Bear: my list" });
    const favourite = actions.getByRole("button", { name: "Favourite" });
    const watching = actions.getByRole("button", { name: "Watching" });

    await favourite.click();
    await expect(favourite).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Added The Bear to Favourites.")).toBeVisible();

    await actions.getByRole("button", { name: "Want to watch" }).click();
    await watching.click();
    await expect(watching).toHaveAttribute("aria-pressed", "true");
    await expect(actions.getByRole("button", { name: "Want to watch" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Saved across reloads.
    await page.reload();
    await expect(watching).toHaveAttribute("aria-pressed", "true");
    await expect(favourite).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: "View my list" }).click();
    await expect(page).toHaveURL(/\/my-list\?list=watching$/);
    const nav = page.getByRole("navigation", { name: "My lists" });
    await expect(nav.getByRole("link", { name: "Watching (1)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Favourites (1)" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Want to watch (0)" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Watching" })).toContainText("The Bear");

    // Finish it from the list page: it moves from Watching to Watched.
    await page
      .getByRole("group", { name: "The Bear: my list" })
      .getByRole("button", { name: "Watched" })
      .click();
    await expect(page.getByText("Added The Bear to Watched.")).toBeVisible();
    await expect(page.getByText(/Nothing here yet/)).toBeVisible();
    await nav.getByRole("link", { name: "Watched (1)" }).click();
    await expect(page.getByRole("list", { name: "Watched" })).toContainText("The Bear");

    // Remove takes it off every list.
    await page.getByRole("button", { name: "Remove The Bear from my list" }).click();
    await expect(nav.getByRole("link", { name: "Watched (0)" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Favourites (0)" })).toBeVisible();
  });

  test("choosing the active status again clears it", async ({ page }) => {
    await page.goto("/movie/116149");
    const want = page
      .getByRole("group", { name: "Paddington: my list" })
      .getByRole("button", { name: "Want to watch" });
    await want.click();
    await expect(want).toHaveAttribute("aria-pressed", "true");
    await want.click();
    await expect(want).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Removed Paddington from Want to watch.")).toBeVisible();
  });

  test("is reachable from the header and starts empty", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "My list" })
      .click();
    await expect(page.getByRole("heading", { name: "My list" })).toBeVisible();
    await expect(page.getByText(/Nothing here yet/)).toBeVisible();
  });
});
