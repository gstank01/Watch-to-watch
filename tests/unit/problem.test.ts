import { describe, expect, it, vi } from "vitest";
import { TmdbError } from "@/lib/tmdb/client";
import { reportTmdbError, tmdbProblemMessage } from "@/lib/tmdb/problem";

describe("TMDB problem messages", () => {
  it("tells the site owner how to fix setup problems", () => {
    expect(tmdbProblemMessage(new TmdbError("TMDB_API_TOKEN is not set", "config"))).toMatch(
      /no TMDB API token.*TMDB_API_TOKEN/,
    );
    expect(
      tmdbProblemMessage(new TmdbError("TMDB_API_TOKEN looks like the short v3 API key", "config")),
    ).toMatch(/API Read Access Token/);
    expect(tmdbProblemMessage(new TmdbError("HTTP 401", "auth", 401))).toMatch(
      /rejected the API token/,
    );
  });

  it("asks visitors to try again for outages", () => {
    expect(tmdbProblemMessage(new TmdbError("down", "network"))).toMatch(/can't reach/);
    expect(tmdbProblemMessage(new TmdbError("HTTP 503", "http", 503))).toMatch(/try again/);
    expect(tmdbProblemMessage(new Error("boom"))).toMatch(/try again/);
  });

  it("logs the cause to the server log", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    reportTmdbError(
      new TmdbError("TMDB /watch/providers/tv failed with HTTP 401", "auth", 401),
      "services list (BG)",
    );
    expect(log).toHaveBeenCalledWith(
      "[tmdb] services list (BG): TMDB /watch/providers/tv failed with HTTP 401",
    );
    log.mockRestore();
  });
});
