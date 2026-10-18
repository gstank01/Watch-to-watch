import { describe, expect, it } from "vitest";
import { migrationUrl } from "../../scripts/db-url.mjs";

const NEON_POOLED =
  "postgresql://neondb_owner:pw@ep-cool-river-a1b2c3d4-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("migrationUrl", () => {
  it("switches Neon's pooled address to the direct one for migrations", () => {
    const result = migrationUrl({ DATABASE_URL: NEON_POOLED });
    expect(result).toEqual({
      url: "postgresql://neondb_owner:pw@ep-cool-river-a1b2c3d4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });
  });

  it("prefers DATABASE_URL_UNPOOLED when set (Vercel's Neon integration adds it)", () => {
    const direct = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    expect(migrationUrl({ DATABASE_URL: NEON_POOLED, DATABASE_URL_UNPOOLED: direct })).toEqual({
      url: direct,
    });
  });

  it("leaves other databases alone, trimming stray spaces", () => {
    expect(migrationUrl({ DATABASE_URL: "  postgresql://postgres@localhost:5433/wtw\n" })).toEqual({
      url: "postgresql://postgres@localhost:5433/wtw",
    });
  });

  it("explains a string copied from Neon's psql tab or with quotes", () => {
    for (const bad of [`psql '${NEON_POOLED}'`, `'${NEON_POOLED}'`, `"${NEON_POOLED}"`]) {
      const result = migrationUrl({ DATABASE_URL: bad });
      expect("problem" in result && result.problem).toMatch(/extra text/);
    }
  });

  it("explains something that isn't a Postgres address", () => {
    expect(migrationUrl({ DATABASE_URL: "neondb" })).toMatchObject({
      problem: expect.stringMatching(/valid address/),
    });
    expect(
      migrationUrl({ DATABASE_URL: "https://console.neon.tech/app/projects/x" }),
    ).toMatchObject({
      problem: expect.stringMatching(/postgresql:\/\//),
    });
  });
});
