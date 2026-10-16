import { describe, expect, it } from "vitest";
import { regionInfo, resolveRegion, SUPPORTED_REGION_CODES } from "@/lib/region-shared";

describe("resolveRegion", () => {
  it("supports the UK and Bulgaria", () => {
    expect(SUPPORTED_REGION_CODES).toEqual(["GB", "BG"]);
    expect(regionInfo("BG")).toMatchObject({ name: "Bulgaria", flag: "🇧🇬" });
  });

  it("prefers the visitor's saved choice over their location", () => {
    expect(resolveRegion({ saved: "GB", geo: "BG", fallback: "GB" })).toBe("GB");
    expect(resolveRegion({ saved: "BG", geo: "GB", fallback: "GB" })).toBe("BG");
  });

  it("uses the visitor's country when there is no saved choice", () => {
    expect(resolveRegion({ geo: "BG", fallback: "GB" })).toBe("BG");
    expect(resolveRegion({ geo: "bg", fallback: "GB" })).toBe("BG");
  });

  it("falls back to the default for unsupported or missing values", () => {
    expect(resolveRegion({ saved: "US", geo: "FR", fallback: "BG" })).toBe("BG");
    expect(resolveRegion({ saved: "xx", geo: null, fallback: "ZZ" })).toBe("GB");
    expect(resolveRegion({})).toBe("GB");
  });
});
