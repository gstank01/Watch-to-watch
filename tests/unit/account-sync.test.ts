// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSync } from "@/lib/account/sync";
import { setStatus, type LibraryEntry, type LibraryTitle } from "@/lib/library/model";
import { readLibrary, updateLibrary } from "@/lib/library/store";
import { writeServices } from "@/lib/services/store";

const BEAR: LibraryTitle = {
  id: 136315,
  mediaType: "tv",
  title: "The Bear",
  year: "2022",
  posterPath: null,
};
const PAD: LibraryTitle = {
  id: 116149,
  mediaType: "movie",
  title: "Paddington",
  year: "2014",
  posterPath: null,
};

/** A fake account API that records what the browser sends. */
function fakeServer(initial: LibraryEntry[] = []) {
  const posts: { upsert: LibraryEntry[]; remove: unknown[] }[] = [];
  const puts: number[][] = [];
  let entries = initial;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
      if (url === "/api/watchlist" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push(body);
        entries = [
          ...entries.filter((e) => !body.upsert.some((u: LibraryEntry) => u.id === e.id)),
          ...body.upsert,
        ];
        return json({ ok: true });
      }
      if (url === "/api/services" && init?.method === "PUT") {
        puts.push(JSON.parse(String(init.body)).providerIds);
        return json({ ok: true });
      }
      if (url === "/api/watchlist") return json({ entries });
      if (url === "/api/services") return json({ providerIds: [] });
      return new Response("", { status: 404 });
    }),
  );
  return { posts, puts };
}

const settle = () => new Promise((r) => setTimeout(r, 20));

describe("account sync", () => {
  let stop: () => void = () => {};
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    stop();
    vi.unstubAllGlobals();
  });

  it("sends every change made after loading, one after another", async () => {
    window.localStorage.setItem("wtw:account:v1", JSON.stringify("user-1")); // already synced
    const server = fakeServer();
    stop = startSync("user-1");
    await settle();
    expect(server.posts).toHaveLength(0);

    updateLibrary((l) => setStatus(l, BEAR, "want"));
    await settle();
    updateLibrary((l) => setStatus(l, PAD, "watching"));
    await settle();
    writeServices([8]);
    await settle();

    expect(server.posts.map((p) => p.upsert.map((e) => e.title))).toEqual([
      ["The Bear"],
      ["Paddington"],
    ]);
    expect(server.puts).toEqual([[8]]);
  });

  it("merges this browser's list into the account on first sign-in", async () => {
    const remote = setStatus({}, PAD, "want", new Date("2026-10-16T09:00:00Z"))["movie:116149"];
    const server = fakeServer([remote]);
    updateLibrary((l) => setStatus(l, BEAR, "watched")); // saved before signing in
    stop = startSync("user-2");
    await settle();

    expect(server.posts.map((p) => p.upsert.map((e) => e.title))).toEqual([["The Bear"]]);
    expect(Object.keys(readLibrary()).sort()).toEqual(["movie:116149", "tv:136315"]);
    expect(JSON.parse(window.localStorage.getItem("wtw:account:v1")!)).toBe("user-2");
  });

  it("takes the account's copy on later visits, so removals elsewhere show up", async () => {
    window.localStorage.setItem("wtw:account:v1", JSON.stringify("user-3"));
    updateLibrary((l) => setStatus(l, BEAR, "watching")); // stale copy, removed on another device
    fakeServer([]);
    stop = startSync("user-3");
    await settle();
    expect(readLibrary()).toEqual({});
  });
});
