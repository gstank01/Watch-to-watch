import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setSleepForTests, tmdbFetch, TmdbError } from "@/lib/tmdb/client";
import { discover, getProviders, getTv, getWatchProviders, searchTitles } from "@/lib/tmdb";
import { genreListSchema } from "@/lib/tmdb/schemas";
import { setupTmdbMock } from "./msw";

const server = setupTmdbMock();
const sleep = vi.fn(async () => {});
beforeAll(() => setSleepForTests(sleep));

describe("TMDB client", () => {
  it("searches films and TV and drops people", async () => {
    const { results } = await searchTitles("bear", "GB");
    expect(results.map((r) => `${r.mediaType}:${r.title}`)).toEqual([
      "tv:The Bear",
      "movie:The Bear",
    ]); // "Bear Grylls" (a person) is dropped
    expect(results[0]).toMatchObject({ id: 136315, year: "2022", posterPath: "/the-bear.jpg" });
  });

  it("sends the bearer token and region to TMDB", async () => {
    let seen: Request | undefined;
    server.events.on("request:start", ({ request }) => {
      seen = request;
    });
    await searchTitles("bear", "GB");
    expect(seen?.headers.get("authorization")).toBe("Bearer test-token");
    expect(new URL(seen!.url).searchParams.get("region")).toBe("GB");
    server.events.removeAllListeners();
  });

  it("returns the requested region's watch providers, or {} when none", async () => {
    const gb = await getWatchProviders("tv", 136315, "GB");
    expect(gb.flatrate?.map((p) => p.provider_name)).toEqual(["Disney Plus"]);
    expect(await getWatchProviders("tv", 136315, "FR")).toEqual({});
  });

  it("merges movie and TV provider lists without duplicates", async () => {
    const providers = await getProviders("GB");
    const ids = providers.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(41); // TV-only
    expect(ids).toContain(2); // movie-only
    expect(providers[0].name).toBe("Netflix");
  });

  it("passes discover filters with pipe-separated OR lists", async () => {
    let url: URL | undefined;
    server.events.on("request:start", ({ request }) => {
      url = new URL(request.url);
    });
    const res = await discover("movie", {
      region: "GB",
      providerIds: [8, 38],
      monetization: ["flatrate", "free"],
      genreIds: [35],
      maxRuntime: 90,
    });
    expect(url?.searchParams.get("with_watch_providers")).toBe("8|38");
    expect(url?.searchParams.get("with_watch_monetization_types")).toBe("flatrate|free");
    expect(url?.searchParams.get("with_runtime.lte")).toBe("90");
    expect(res.results.map((r) => r.title)).toEqual(["Paddington"]);
    server.events.removeAllListeners();
  });

  it("throws TmdbError with status 404 for unknown titles", async () => {
    await expect(getTv(1)).rejects.toMatchObject({ name: "TmdbError", status: 404 });
  });

  it("retries on 429 with backoff, honouring Retry-After", async () => {
    let calls = 0;
    server.use(
      http.get("*/genre/movie/list", () => {
        calls++;
        return calls < 3
          ? new HttpResponse(null, { status: 429, headers: { "Retry-After": "2" } })
          : HttpResponse.json({ genres: [{ id: 35, name: "Comedy" }] });
      }),
    );
    sleep.mockClear();
    const data = await tmdbFetch("/genre/movie/list", genreListSchema, { revalidate: 1 });
    expect(data.genres).toHaveLength(1);
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("gives up after maxAttempts", async () => {
    server.use(http.get("*/genre/tv/list", () => new HttpResponse(null, { status: 429 })));
    await expect(
      tmdbFetch("/genre/tv/list", genreListSchema, { revalidate: 1, maxAttempts: 2 }),
    ).rejects.toBeInstanceOf(TmdbError);
  });

  it("rejects responses that don't match the schema", async () => {
    server.use(http.get("*/genre/tv/list", () => HttpResponse.json({ genres: "nope" })));
    await expect(tmdbFetch("/genre/tv/list", genreListSchema, { revalidate: 1 })).rejects.toThrow(
      /Unexpected TMDB response/,
    );
  });

  it("refuses to run without a token", async () => {
    const token = process.env.TMDB_API_TOKEN;
    delete process.env.TMDB_API_TOKEN;
    await expect(searchTitles("bear", "GB")).rejects.toThrow(/TMDB_API_TOKEN/);
    process.env.TMDB_API_TOKEN = token;
  });
});
