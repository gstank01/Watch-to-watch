import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/",
  "/search?q=bear",
  "/tv/136315",
  "/movie/116149",
  "/services",
  "/my-list",
  "/sign-in",
  "/about",
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const path of PAGES) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(path);
        await expectNoViolations(page);
      });
    }

    test("a filled-in My list has no WCAG 2.2 AA violations", async ({ page }) => {
      // Put The Bear on two lists, with pressed buttons, before the page loads.
      await page.addInitScript(() => {
        const entry = {
          id: 136315,
          mediaType: "tv",
          title: "The Bear",
          year: "2022",
          posterPath: null,
          favourite: true,
          status: "watching",
          updatedAt: "2026-10-16T10:00:00.000Z",
        };
        window.localStorage.setItem("wtw:library:v1", JSON.stringify({ "tv:136315": entry }));
      });
      await page.goto("/my-list?list=watching");
      await expect(page.getByRole("list", { name: "Watching" })).toContainText("The Bear");
      await expectNoViolations(page);
    });
  });
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}
