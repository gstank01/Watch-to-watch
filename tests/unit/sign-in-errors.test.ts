import { describe, expect, it } from "vitest";
import { explainStartError } from "@/components/google-sign-in";

const SITE = "https://watch-to-watch.vercel.app";

describe("why Google sign-in didn't start", () => {
  it("points to the main address when the page is on another one", () => {
    const msg = explainStartError(
      { status: 403, code: "INVALID_ORIGIN", message: "Invalid origin" },
      SITE,
      "https://watch-to-watch-abc123-me.vercel.app",
    );
    expect(msg).toContain(SITE);
    expect(msg).toContain("https://watch-to-watch-abc123-me.vercel.app");
    expect(msg).toContain("AUTH_URL");
  });

  it("says when there's no connection, or too many tries", () => {
    expect(explainStartError({}, SITE, SITE)).toMatch(/couldn't reach our server/);
    expect(explainStartError({ status: 429 }, SITE, SITE)).toMatch(/Too many attempts/);
  });

  it("passes on the server's reason for anything else", () => {
    expect(
      explainStartError(
        { status: 500, code: "INTERNAL", message: "Database unavailable" },
        SITE,
        SITE,
      ),
    ).toBe("Sign-in couldn't start (INTERNAL: Database unavailable). Please try again.");
  });
});
