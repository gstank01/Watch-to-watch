import { describe, expect, it } from "vitest";
import { watchLinkFor } from "@/lib/availability/links";
import { loadProviderLinksFile } from "@/lib/data/load";
import type { ProviderLink } from "@/lib/data/schemas";

const LINKS: ProviderLink[] = [
  {
    provider_id: 8,
    provider_name: "Netflix",
    home_url: "https://www.netflix.com/",
    search_url: "https://www.netflix.com/search?q={query}",
  },
  { provider_id: 9, provider_name: "Prime Video", home_url: "https://www.primevideo.com/" },
  {
    provider_id: 9,
    provider_name: "Prime Video",
    region: "GB",
    home_url: "https://www.amazon.co.uk/gp/video/storefront",
    search_url: "https://www.amazon.co.uk/s?k={query}&i=instant-video",
  },
  { provider_id: 337, provider_name: "Disney Plus", home_url: "https://www.disneyplus.com/" },
];

describe("watchLinkFor", () => {
  it("links to the service's own search for the title", () => {
    expect(watchLinkFor(LINKS, 8, "GB", "The Bear")).toEqual({
      url: "https://www.netflix.com/search?q=The%20Bear",
      kind: "search",
    });
  });

  it("encodes titles safely", () => {
    expect(watchLinkFor(LINKS, 8, "GB", "Tom & Jerry: #1?")?.url).toBe(
      "https://www.netflix.com/search?q=Tom%20%26%20Jerry%3A%20%231%3F",
    );
  });

  it("falls back to the home page when there's no search link", () => {
    expect(watchLinkFor(LINKS, 337, "BG", "The Bear")).toEqual({
      url: "https://www.disneyplus.com/",
      kind: "home",
    });
  });

  it("prefers a region's own entry over the all-regions one", () => {
    expect(watchLinkFor(LINKS, 9, "GB", "Paddington")?.url).toBe(
      "https://www.amazon.co.uk/s?k=Paddington&i=instant-video",
    );
    expect(watchLinkFor(LINKS, 9, "BG", "Paddington")).toEqual({
      url: "https://www.primevideo.com/",
      kind: "home",
    });
  });

  it("returns null for services we have no link for", () => {
    expect(watchLinkFor(LINKS, 35, "GB", "The Bear")).toBeNull();
  });

  it("has direct links for the main UK services in the committed file", () => {
    const links = loadProviderLinksFile();
    for (const id of [8, 9, 337, 350, 38, 41, 103]) {
      expect(watchLinkFor(links, id, "GB", "The Bear"), `provider ${id}`).not.toBeNull();
    }
  });
});
