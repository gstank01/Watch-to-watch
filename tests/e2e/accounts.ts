import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { EMAIL_OUTBOX } from "../../playwright.config";

export const accountsEnabled = !!process.env.E2E_DATABASE_URL;

/** A fresh address per test, so parallel tests never share an account. */
export const newEmail = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

function outbox(): { file: string; to: string; text: string }[] {
  let files: string[] = [];
  try {
    files = readdirSync(EMAIL_OUTBOX);
  } catch {}
  return files.map((file) => ({
    file,
    ...JSON.parse(readFileSync(path.join(EMAIL_OUTBOX, file), "utf8")),
  }));
}

/** The link in the first email to `email` that isn't in `seen`. */
async function newLinkFor(email: string, seen: Set<string>): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const mail = outbox().find((m) => m.to === email && !seen.has(m.file));
    const link = mail?.text.match(/https?:\/\/\S+verify\S+/)?.[0];
    if (link) return link;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No sign-in email arrived for ${email}`);
}

/** Signs in through the real form and the emailed magic link. */
export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  // Each sign-in sends a new single-use link; ignore earlier ones.
  const seen = new Set(outbox().map((m) => m.file));
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(await newLinkFor(email, seen));
  await expect(page).toHaveURL(/\/my-list$/);
  await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
}

/** Waits until the account (on the server) holds what we expect. */
export async function expectAccountList(page: Page, titles: string[]) {
  await expect
    .poll(async () => {
      const res = await page.request.get("/api/watchlist");
      const body = (await res.json()) as { entries?: { title: string }[] };
      return (body.entries ?? []).map((e) => e.title).sort();
    })
    .toEqual([...titles].sort());
}
