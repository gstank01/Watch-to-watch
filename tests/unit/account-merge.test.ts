import { describe, expect, it } from "vitest";
import {
  acknowledge,
  applyPending,
  diffLibraries,
  EMPTY_PENDING,
  hasPending,
  mergeLibraries,
  mergeServices,
  queueChanges,
} from "@/lib/account/merge";
import { libraryChangesSchema } from "@/lib/account/schemas";
import { setStatus, toggleFavourite, type LibraryTitle } from "@/lib/library/model";

const BEAR: LibraryTitle = {
  id: 136315,
  mediaType: "tv",
  title: "The Bear",
  year: "2022",
  posterPath: "/b.jpg",
};
const PAD: LibraryTitle = {
  id: 116149,
  mediaType: "movie",
  title: "Paddington",
  year: "2014",
  posterPath: null,
};
const at = (minute: number) => new Date(Date.UTC(2026, 9, 16, 10, minute));

describe("merging a browser list into an account", () => {
  it("keeps titles from both and the newest change for titles in both", () => {
    const local = setStatus(setStatus({}, BEAR, "watched", at(5)), PAD, "want", at(1));
    const remote = toggleFavourite(setStatus({}, BEAR, "watching", at(2)), BEAR, at(3));
    const merged = mergeLibraries(local, remote);
    expect(merged["tv:136315"]).toMatchObject({ status: "watched", favourite: false });
    expect(merged["movie:116149"]).toMatchObject({ status: "want" });
  });

  it("prefers the account's copy on a tie", () => {
    const local = setStatus({}, BEAR, "want", at(1));
    const remote = setStatus({}, BEAR, "watched", at(1));
    expect(mergeLibraries(local, remote)["tv:136315"].status).toBe("watched");
  });

  it("unions services", () => {
    expect(mergeServices([8, 337], [337, 9])).toEqual([337, 9, 8]);
  });
});

describe("tracking changes", () => {
  it("diffs added, changed and removed titles", () => {
    const prev = setStatus(setStatus({}, BEAR, "want", at(0)), PAD, "want", at(0));
    const next = setStatus(prev, BEAR, "watching", at(1));
    delete next["movie:116149"];
    expect(diffLibraries(prev, next)).toEqual({
      upsert: [next["tv:136315"]],
      remove: [{ id: PAD.id, mediaType: "movie" }],
    });
    expect(diffLibraries(next, next)).toEqual({ upsert: [], remove: [] });
  });

  it("queues later changes over earlier ones", () => {
    const a = setStatus({}, BEAR, "want", at(0));
    let pending = queueChanges(EMPTY_PENDING, diffLibraries({}, a));
    pending = queueChanges(pending, diffLibraries(a, {}));
    expect(pending.upsert).toEqual({});
    expect(Object.keys(pending.remove)).toEqual(["tv:136315"]);
    const b = setStatus({}, BEAR, "watched", at(2));
    pending = queueChanges(pending, diffLibraries({}, b));
    expect(pending.remove).toEqual({});
    expect(pending.upsert["tv:136315"].status).toBe("watched");
  });

  it("only acknowledges what was actually sent", () => {
    const v1 = setStatus({}, BEAR, "want", at(0));
    const sent = { ...queueChanges(EMPTY_PENDING, diffLibraries({}, v1)), services: [8] };
    // The visitor changes it again while the request is in flight.
    const v2 = setStatus(v1, BEAR, "watching", at(1));
    const now = queueChanges(sent, diffLibraries(v1, v2));
    const left = acknowledge(now, sent);
    expect(left.upsert["tv:136315"].status).toBe("watching");
    expect(left.services).toBeNull();
    expect(hasPending(acknowledge(left, left))).toBe(false);
  });

  it("re-applies pending changes on top of the account's list", () => {
    const remote = setStatus({}, PAD, "want", at(0));
    const local = setStatus({}, BEAR, "watching", at(1));
    let pending = queueChanges(EMPTY_PENDING, diffLibraries({}, local));
    pending = queueChanges(pending, { upsert: [], remove: [{ id: PAD.id, mediaType: "movie" }] });
    expect(Object.keys(applyPending(remote, pending))).toEqual(["tv:136315"]);
  });
});

describe("validating changes sent to the server", () => {
  it("accepts real entries and rejects bad ones", () => {
    const entry = setStatus({}, BEAR, "want", at(0))["tv:136315"];
    expect(libraryChangesSchema.safeParse({ upsert: [entry], remove: [] }).success).toBe(true);
    // A browser still running the version before ratings sends no `rating`.
    const older: Partial<typeof entry> = { ...entry };
    delete older.rating;
    const parsed = libraryChangesSchema.parse({ upsert: [older], remove: [] });
    expect(parsed.upsert[0].rating).toBeNull();
    for (const bad of [
      { ...entry, status: "binged" },
      { ...entry, id: 0 },
      { ...entry, posterPath: "https://evil.example/x.jpg" },
      { ...entry, updatedAt: "yesterday" },
      { ...entry, title: "" },
      { ...entry, rating: 6 },
      { ...entry, rating: 3.5 },
    ]) {
      expect(libraryChangesSchema.safeParse({ upsert: [bad], remove: [] }).success).toBe(false);
    }
    const tooMany = Array.from({ length: 501 }, (_, i) => ({ id: i + 1, mediaType: "tv" }));
    expect(libraryChangesSchema.safeParse({ upsert: [], remove: tooMany }).success).toBe(false);
  });
});
