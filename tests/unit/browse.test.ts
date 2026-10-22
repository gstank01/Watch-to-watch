import { describe, expect, it } from "vitest";
import { browseHref, MAX_PAGE, parseBrowse } from "@/lib/browse";
import { popularByService } from "@/lib/popular";
import { setupTmdbMock } from "./msw";

setupTmdbMock();

describe("browse filters in the URL", () => {
  it("reads filters, ignoring anything odd", () => {
    expect(parseBrowse({})).toEqual({
      type: "movie",
      genre: null,
      where: "all",
      services: [],
      sort: "popular",
      page: 1,
    });
    expect(
      parseBrowse({
        type: "tv",
        genre: "35",
        where: "mine",
        services: "8,337,8,abc,-1",
        sort: "top",
        page: "3",
      }),
    ).toEqual({ type: "tv", genre: 35, where: "mine", services: [8, 337], sort: "top", page: 3 });
    expect(
      parseBrowse({ type: "music", genre: "x", where: "everywhere", sort: "random", page: "0" }),
    ).toMatchObject({ type: "movie", genre: null, where: "all", sort: "popular", page: 1 });
    expect(parseBrowse({ page: "9999" }).page).toBe(MAX_PAGE);
  });

  it("writes short URLs and goes back to page 1 when a filter changes", () => {
    const state = parseBrowse({ genre: "35", page: "4" });
    expect(browseHref(state)).toBe("/browse?genre=35");
    expect(browseHref(state, { page: 5 })).toBe("/browse?genre=35&page=5");
    expect(browseHref(state, { type: "tv", sort: "new" })).toBe(
      "/browse?type=tv&genre=35&sort=new",
    );
    expect(browseHref(state, { where: "mine", services: [8, 337] })).toBe(
      "/browse?genre=35&where=mine&services=8%2C337",
    );
    // Services only travel with "on my services".
    expect(browseHref({ ...state, services: [8] }, { where: "free" })).toBe(
      "/browse?genre=35&where=free",
    );
    expect(browseHref(state, { genre: null })).toBe("/browse");
  });
});

describe("popular on each service", () => {
  it("makes one row per service, in the order given", async () => {
    const rows = await popularByService("GB", [337, 8]);
    expect(rows.map((r) => [r.providerId, r.titles.map((t) => t.title)])).toEqual([
      [337, ["The Bear"]],
      [8, ["Paddington"]],
    ]);
  });
});

describe("categories", () => {
  it("lists film and series categories separately", async () => {
    const { getGenres } = await import("@/lib/tmdb");
    expect((await getGenres("movie")).map((g) => g.name)).toContain("Action");
    expect((await getGenres("tv")).map((g) => g.name)).toContain("Action & Adventure");
  });
});
