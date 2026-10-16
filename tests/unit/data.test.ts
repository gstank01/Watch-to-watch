import { describe, expect, it } from "vitest";
import { loadFreeServicesFile, loadProviderLinksFile, parseDataFile } from "@/lib/data/load";
import { freeServicesFileSchema, providerLinksFileSchema } from "@/lib/data/schemas";

describe("free-services.yaml", () => {
  it("the committed file is valid and includes the main UK free services", () => {
    const entries = loadFreeServicesFile();
    const gb = entries.filter((e) => e.region === "GB").map((e) => e.provider_name);
    expect(gb).toEqual(expect.arrayContaining(["BBC iPlayer", "ITVX", "Channel 4"]));
  });

  it("rejects invalid entries with a readable message", () => {
    const yaml = `- provider_id: "abc"\n  provider_name: X\n  region: gb\n`;
    expect(() => parseDataFile(yaml, freeServicesFileSchema, "test.yaml")).toThrow(
      /test\.yaml: invalid data[\s\S]*provider_id[\s\S]*region/,
    );
  });

  it("rejects regions the app doesn't support", () => {
    const yaml = `- {provider_id: 8, provider_name: Netflix, region: US}\n`;
    expect(() => parseDataFile(yaml, freeServicesFileSchema, "us.yaml")).toThrow(
      /Region must be one of GB, BG/,
    );
  });

  it("rejects duplicate provider/region pairs", () => {
    const yaml = `- {provider_id: 38, provider_name: A, region: GB}\n- {provider_id: 38, provider_name: B, region: GB}\n`;
    expect(() => parseDataFile(yaml, freeServicesFileSchema, "dup.yaml")).toThrow(/Duplicate/);
  });

  it("rejects malformed YAML", () => {
    expect(() => parseDataFile("- [unclosed", freeServicesFileSchema, "bad.yaml")).toThrow(
      /invalid YAML/,
    );
  });
});

describe("provider-links.yaml", () => {
  const parse = (yaml: string) => parseDataFile(yaml, providerLinksFileSchema, "links.yaml");

  it("the committed file is valid", () => {
    expect(loadProviderLinksFile().length).toBeGreaterThan(0);
  });

  it("requires https links", () => {
    expect(() =>
      parse(`- {provider_id: 8, provider_name: N, home_url: "http://n.com/"}\n`),
    ).toThrow(/https/);
  });

  it("requires {query} in search links", () => {
    expect(() =>
      parse(
        `- {provider_id: 8, provider_name: N, home_url: "https://n.com/", search_url: "https://n.com/search"}\n`,
      ),
    ).toThrow(/\{query\}/);
  });

  it("rejects duplicates for the same region, but allows a regional override", () => {
    const base = `- {provider_id: 9, provider_name: P, home_url: "https://p.com/"}\n`;
    const gb = `- {provider_id: 9, provider_name: P, region: GB, home_url: "https://p.co.uk/"}\n`;
    expect(parse(base + gb)).toHaveLength(2);
    expect(() => parse(base + base)).toThrow(/Duplicate/);
  });
});
