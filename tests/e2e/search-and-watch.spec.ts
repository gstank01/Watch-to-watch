import { expect, test, type Page } from "@playwright/test";

const group = (page: Page, key: string) => page.locator(`[data-group="${key}"]`);

test.describe("Flow A: search → where to watch", () => {
  test("autocomplete finds The Bear and the title page groups GB providers", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search films and TV shows" });
    await search.fill("The Bear");

    const options = page.getByRole("listbox", { name: "Suggestions" }).getByRole("option");
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText("The Bear");
    await expect(options.first()).toContainText("Series · 2022");

    await options.first().click();
    await expect(page).toHaveURL(/\/tv\/136315$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Bear");
    await expect(
      page.getByRole("heading", { name: "Where to watch in United Kingdom" }),
    ).toBeVisible();

    // No services picked yet: Disney+ is a subscription, the stores are rent/buy.
    const groups = page.locator("[data-group]");
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toHaveAttribute("data-group", "subscription");
    await expect(group(page, "subscription")).toContainText("Other subscriptions");
    await expect(group(page, "subscription")).toContainText("Disney Plus");

    // Rent / buy is collapsed by default.
    const rentBuy = group(page, "rentBuy");
    await expect(rentBuy).not.toHaveAttribute("open");
    await expect(rentBuy.getByText("Apple TV", { exact: true })).toBeHidden();
    await rentBuy.getByText("Rent / buy (4)").click();
    await expect(rentBuy.getByText("Apple TV", { exact: true })).toBeVisible();
    await expect(page.getByText(/Availability from\s+JustWatch/)).toBeVisible();
  });

  test("buttons go straight to the service, not via TMDB", async ({ page }) => {
    await page.goto("/tv/136315");
    const button = (name: RegExp) => page.locator("[data-group]").getByRole("link", { name });

    // A known search link: the service's own search for the title.
    await page.getByText("Rent / buy (4)").click();
    await expect(button(/^Watch on Apple TV/)).toHaveAttribute(
      "href",
      "https://tv.apple.com/search?term=The%20Bear",
    );
    await expect(button(/^Watch on Google Play Movies/)).toHaveAttribute(
      "href",
      "https://play.google.com/store/search?q=The%20Bear&c=movies",
    );
    // No search link known: the service's home page, labelled honestly.
    const disney = button(/^Open Disney Plus/);
    await expect(disney).toHaveAttribute("href", "https://www.disneyplus.com/");
    await expect(disney).toHaveAttribute("target", "_blank");
    // Not in provider-links.yaml at all: TMDB's page is the only option.
    await expect(button(/^Find on TMDB/)).toHaveAttribute(
      "href",
      /themoviedb\.org\/tv\/136315.*locale=GB/,
    );
    await expect(page.getByRole("link", { name: /See this title on TMDB/ })).toBeVisible();
  });

  test("links follow the country", async ({ page }) => {
    await page.goto("/movie/116149");
    await expect(page.getByRole("link", { name: /^Watch on BBC iPlayer/ })).toHaveAttribute(
      "href",
      "https://www.bbc.co.uk/iplayer/search?q=Paddington",
    );
    await page.getByLabel("Country").selectOption("BG");
    await expect(page.getByRole("heading", { name: "Where to watch in Bulgaria" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Open Amazon Prime Video/ })).toHaveAttribute(
      "href",
      "https://www.primevideo.com/",
    );
    await expect(page.getByRole("link", { name: /^Watch on Netflix/ })).toHaveAttribute(
      "href",
      "https://www.netflix.com/search?q=Paddington",
    );
  });

  test("images come from our own domain, not image.tmdb.org", async ({ request }) => {
    // Check the server-rendered HTML: in tests the fake posters fail to load, so the
    // browser swaps them for the title fallback.
    const html = await (await request.get("/tv/136315")).text();
    expect(html).toContain(
      'src="/_next/image?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fthe-bear.jpg&amp;w=',
    );
    expect(html).not.toMatch(/src="https:\/\/image\.tmdb\.org/);
    expect(html).not.toMatch(/srcSet="https:\/\/image\.tmdb\.org/i);
  });

  test("a poster that can't load shows the title instead", async ({ page }) => {
    await page.goto("/tv/136315");
    await expect(page.getByTestId("poster-fallback").first()).toHaveText("The Bear");
  });

  test("pressing Enter shows full search results", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search films and TV shows" });
    await search.fill("bear");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=bear/);
    const results = page.getByRole("list", { name: "Results for bear" }).getByRole("listitem");
    await expect(results).toHaveCount(2);
    await expect(page.getByText("Bear Grylls")).toHaveCount(0);
  });

  test("free services are shown as Free, ahead of subscriptions", async ({ page }) => {
    await page.goto("/movie/116149");
    const groups = page.locator("[data-group]");
    await expect(groups.nth(0)).toHaveAttribute("data-group", "free");
    await expect(group(page, "free")).toContainText("BBC iPlayer");
    await expect(group(page, "free")).toContainText("Free · Needs a TV Licence.");
    await expect(group(page, "free")).not.toContainText("Subscription");
    await expect(group(page, "subscription")).toContainText("Netflix");
  });

  test("shows a friendly message when nothing streams the title", async ({ page }) => {
    await page.goto("/movie/10142");
    await expect(page.getByText(/couldn.t find anywhere streaming this/)).toBeVisible();
  });

  test("unknown titles 404", async ({ page }) => {
    const res = await page.goto("/tv/1");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  });
});

test.describe("My services", () => {
  test("selecting a service moves it to 'On your services'", async ({ page }) => {
    await page.goto("/services");
    const disney = page.getByRole("checkbox", { name: "Disney Plus" });
    await disney.check();
    await expect(page.getByText("Selected: Disney Plus")).toBeVisible();

    await page.goto("/tv/136315");
    const first = page.locator("[data-group]").first();
    await expect(first).toHaveAttribute("data-group", "mine");
    await expect(first).toContainText("On your services");
    await expect(first).toContainText("Disney Plus");
    await expect(group(page, "subscription")).toHaveCount(0);

    // Persisted across reloads, and the home page shows what's on it.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Popular on your services" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Popular on Disney Plus" })).toContainText(
      "The Bear",
    );
  });

  test("the services list can be filtered and the home page prompts first-time visitors", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Pick my services" }).click();
    await expect(page).toHaveURL(/\/services$/);
    await page.getByPlaceholder("Find a service…").fill("bbc");
    await expect(page.getByRole("checkbox")).toHaveCount(1);
    await expect(page.getByRole("checkbox", { name: /BBC iPlayer/ })).toBeVisible();
  });
});

test.describe("Country", () => {
  test("the picker offers the UK and Bulgaria and switches where-to-watch", async ({ page }) => {
    await page.goto("/movie/116149");
    const picker = page.getByLabel("Country");
    await expect(picker).toHaveValue("GB");
    await expect(picker.getByRole("option")).toHaveText([
      "🇬🇧 United Kingdom",
      "🇧🇬 България / Bulgaria",
    ]);
    await expect(group(page, "free")).toContainText("BBC iPlayer");

    await picker.selectOption("BG");
    await expect(page.getByRole("heading", { name: "Where to watch in Bulgaria" })).toBeVisible();
    await expect(group(page, "free")).toHaveCount(0);
    await expect(group(page, "subscription")).toContainText("Netflix");

    // The choice is remembered.
    await page.goto("/");
    await expect(page.getByLabel("Country")).toHaveValue("BG");
    await expect(
      page.getByRole("heading", { name: "Popular to stream in Bulgaria" }),
    ).toBeVisible();
  });

  test("visitors in Bulgaria start in Bulgaria, and their own choice wins", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "BG" });
    await page.goto("/tv/136315");
    await expect(page.getByLabel("Country")).toHaveValue("BG");
    await expect(page.getByRole("heading", { name: "Where to watch in Bulgaria" })).toBeVisible();

    await page.getByLabel("Country").selectOption("GB");
    await expect(
      page.getByRole("heading", { name: "Where to watch in United Kingdom" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Country")).toHaveValue("GB");
  });

  test("visitors from unsupported countries get the default", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "FR" });
    await page.goto("/");
    await expect(page.getByLabel("Country")).toHaveValue("GB");
  });
});

test("about page credits TMDB and JustWatch", async ({ page }) => {
  await page.goto("/about");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "The Movie Database (TMDB)" })).toBeVisible();
  await expect(main.getByText("not endorsed or certified by TMDB")).toBeVisible();
  await expect(main.getByRole("link", { name: "JustWatch" })).toBeVisible();
});
