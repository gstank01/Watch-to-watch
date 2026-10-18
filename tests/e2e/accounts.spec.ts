import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { accountsEnabled, expectAccountList, newEmail, signIn } from "./accounts";

test.skip(!accountsEnabled, "Set E2E_DATABASE_URL to run the accounts tests");

const listNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "My lists" });

test.describe("Accounts", () => {
  test("My list follows you to another device, including changes and removals", async ({
    page,
    browser,
  }) => {
    const email = newEmail();

    // Saved before signing in, then carried into the new account.
    await page.goto("/tv/136315");
    const actions = page.getByRole("group", { name: "The Bear: my list" });
    await actions.getByRole("button", { name: "Favourite" }).click();
    await actions.getByRole("button", { name: "Watching" }).click();
    await page.goto("/services");
    await page.getByRole("checkbox", { name: "Disney Plus" }).check();

    await signIn(page, email);
    await expect(listNav(page).getByRole("link", { name: "Watching (1)" })).toBeVisible();
    await expectAccountList(page, ["The Bear"]);

    // A second device: a separate browser with nothing saved.
    const other = await browser.newContext();
    const page2 = await other.newPage();
    await signIn(page2, email);
    await page2.goto("/my-list?list=watching");
    await expect(page2.getByRole("list", { name: "Watching" })).toContainText("The Bear");
    await page2.goto("/services");
    await expect(page2.getByRole("checkbox", { name: "Disney Plus" })).toBeChecked();

    // Finish it on the second device...
    await page2.goto("/my-list?list=watching");
    await page2
      .getByRole("group", { name: "The Bear: my list" })
      .getByRole("button", { name: "Watched" })
      .click();
    await expect
      .poll(
        async () => (await (await page2.request.get("/api/watchlist")).json()).entries[0]?.status,
      )
      .toBe("watched");

    // ...and the first device sees it on its next visit.
    await page.goto("/my-list?list=watched");
    await expect(page.getByRole("list", { name: "Watched" })).toContainText("The Bear");

    // Removing it on one device removes it everywhere.
    await page2.goto("/my-list?list=watched");
    await page2.getByRole("button", { name: "Remove The Bear from my list" }).click();
    await expectAccountList(page2, []);
    await page.goto("/my-list?list=favourites");
    await expect(listNav(page).getByRole("link", { name: "Favourites (0)" })).toBeVisible();

    await other.close();
  });

  test("signing out clears this browser, signing back in restores, deleting erases", async ({
    page,
  }) => {
    const email = newEmail();
    await signIn(page, email);
    await page.goto("/movie/116149");
    await page
      .getByRole("group", { name: "Paddington: my list" })
      .getByRole("button", { name: "Want to watch" })
      .click();
    await expectAccountList(page, ["Paddington"]);

    await page.getByRole("link", { name: "Account" }).click();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    // Sign out: nothing of the account is left in this browser.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await page.goto("/my-list");
    await expect(listNav(page).getByRole("link", { name: "Want to watch (0)" })).toBeVisible();

    // Sign back in: it's all still in the account.
    await signIn(page, email);
    await page.goto("/my-list?list=want");
    await expect(page.getByRole("list", { name: "Want to watch" })).toContainText("Paddington");

    // Delete the account: gone from the server too.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("button", { name: "Yes, delete everything" }).click();
    await expect(page).toHaveURL(/\/\?deleted=1$/);
    await expect((await page.request.get("/api/watchlist")).status()).toBe(401);
    await signIn(page, email); // same email: a brand-new, empty account
    await expect(listNav(page).getByRole("link", { name: "Want to watch (0)" })).toBeVisible();
    await expectAccountList(page, []);
  });

  test("Continue with Google asks Google for the email address only", async ({ page }) => {
    // Google can't be reached from tests: catch the hand-off and check what we ask for.
    let googleUrl: URL | undefined;
    await page.route("https://accounts.google.com/**", (route) => {
      googleUrl = new URL(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<h1>Google</h1>" });
    });
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email address")).toBeVisible(); // both methods offered
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByRole("heading", { name: "Google" })).toBeVisible();

    const params = googleUrl!.searchParams;
    expect(googleUrl!.pathname).toMatch(/\/o\/oauth2\/.*auth/);
    expect(params.get("client_id")).toBe("e2e-client.apps.googleusercontent.com");
    expect(params.get("redirect_uri")).toBe("http://localhost:3100/api/auth/callback/google");
    expect(params.get("scope")?.split(" ").sort()).toEqual(["email", "openid"]);
    expect(params.get("prompt")).toBe("select_account");
    expect(params.get("state")).toBeTruthy(); // protects the round trip
  });

  test("a Google sign-in that didn't finish says so", async ({ page }) => {
    await page.goto("/sign-in?failed=google&error=access_denied");
    await expect(page.getByText("Signing in with Google didn't finish")).toBeVisible();
    await expect(page.getByText(/expired or was already used/)).toHaveCount(0);
  });

  test("an expired or used link explains what to do", async ({ page }) => {
    await page.goto(
      "/api/auth/magic-link/verify?token=not-a-real-token&callbackURL=%2Fmy-list&errorCallbackURL=%2Fsign-in%3Flink%3Dinvalid",
    );
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText(/expired or was already used/)).toBeVisible();
  });

  test("account data needs a signed-in user and our own origin", async ({ request }) => {
    expect((await request.get("/api/watchlist")).status()).toBe(401);
    const crossSite = await request.post("/api/watchlist", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: { upsert: [], remove: [] },
    });
    expect(crossSite.status()).toBe(403);
  });
});
