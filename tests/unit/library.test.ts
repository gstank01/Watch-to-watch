import { describe, expect, it } from "vitest";
import {
  libraryKey,
  listCounts,
  parseLibrary,
  removeTitle,
  setRating,
  setStatus,
  titlesIn,
  toggleFavourite,
  type Library,
  type LibraryTitle,
} from "@/lib/library/model";

const BEAR: LibraryTitle = {
  id: 136315,
  mediaType: "tv",
  title: "The Bear",
  year: "2022",
  posterPath: "/the-bear.jpg",
};
const PADDINGTON: LibraryTitle = {
  id: 116149,
  mediaType: "movie",
  title: "Paddington",
  year: "2014",
  posterPath: null,
};
const t = (minute: number) => new Date(Date.UTC(2026, 9, 16, 10, minute));

describe("library", () => {
  it("gives each title one watch status at a time", () => {
    let lib: Library = {};
    lib = setStatus(lib, BEAR, "want", t(0));
    expect(titlesIn(lib, "want").map((e) => e.title)).toEqual(["The Bear"]);
    lib = setStatus(lib, BEAR, "watching", t(1));
    expect(titlesIn(lib, "want")).toEqual([]);
    expect(titlesIn(lib, "watching").map((e) => e.title)).toEqual(["The Bear"]);
    expect(lib[libraryKey(BEAR)]).toMatchObject({
      status: "watching",
      updatedAt: t(1).toISOString(),
    });
  });

  it("keeps favourites independent of the watch status", () => {
    let lib = toggleFavourite({}, BEAR, t(0));
    lib = setStatus(lib, BEAR, "watched", t(1));
    expect(titlesIn(lib, "favourites").map((e) => e.id)).toEqual([BEAR.id]);
    expect(titlesIn(lib, "watched").map((e) => e.id)).toEqual([BEAR.id]);
    lib = setStatus(lib, BEAR, null, t(2));
    expect(titlesIn(lib, "favourites")).toHaveLength(1);
    expect(listCounts(lib)).toEqual({ want: 0, watching: 0, watched: 0, favourites: 1 });
  });

  it("drops a title once it has no status and isn't a favourite", () => {
    let lib = setStatus({}, BEAR, "want", t(0));
    lib = toggleFavourite(lib, BEAR, t(1));
    lib = toggleFavourite(lib, BEAR, t(2));
    expect(Object.keys(lib)).toHaveLength(1);
    lib = setStatus(lib, BEAR, null, t(3));
    expect(lib).toEqual({});
  });

  it("removes a title from every list", () => {
    let lib = toggleFavourite(setStatus({}, BEAR, "watching", t(0)), BEAR, t(1));
    lib = setStatus(lib, PADDINGTON, "watching", t(2));
    lib = removeTitle(lib, BEAR);
    expect(Object.values(lib).map((e) => e.title)).toEqual(["Paddington"]);
  });

  it("lists the most recently changed first", () => {
    let lib = setStatus({}, BEAR, "want", t(0));
    lib = setStatus(lib, PADDINGTON, "want", t(5));
    expect(titlesIn(lib, "want").map((e) => e.title)).toEqual(["Paddington", "The Bear"]);
    lib = setStatus(lib, BEAR, "want", t(9));
    expect(titlesIn(lib, "want").map((e) => e.title)).toEqual(["The Bear", "Paddington"]);
  });

  it("refreshes stored title details on change", () => {
    let lib = setStatus({}, BEAR, "want", t(0));
    lib = toggleFavourite(lib, { ...BEAR, posterPath: "/new.jpg" }, t(1));
    expect(lib[libraryKey(BEAR)].posterPath).toBe("/new.jpg");
  });

  it("round-trips through storage and ignores malformed data", () => {
    const lib = toggleFavourite(setStatus({}, BEAR, "watching", t(0)), PADDINGTON, t(1));
    expect(parseLibrary(JSON.stringify(lib))).toEqual(lib);
    expect(parseLibrary(null)).toEqual({});
    expect(parseLibrary("not json")).toEqual({});
    expect(parseLibrary("[1,2]")).toEqual({});
    const bad = {
      a: { ...lib[libraryKey(BEAR)], status: "binged" },
      b: { ...lib[libraryKey(BEAR)], id: -1 },
      c: { ...lib[libraryKey(BEAR)], favourite: false, status: null },
      d: lib[libraryKey(PADDINGTON)],
    };
    expect(Object.keys(parseLibrary(JSON.stringify(bad)))).toEqual([libraryKey(PADDINGTON)]);
  });
});

describe("ratings", () => {
  it("rates a title 1-5 stars, independent of favourite and status", () => {
    let lib = setRating({}, BEAR, 4, t(0));
    expect(lib[libraryKey(BEAR)]).toMatchObject({ rating: 4, status: null, favourite: false });
    lib = setStatus(lib, BEAR, "watched", t(1));
    lib = setRating(lib, BEAR, 5, t(2));
    expect(lib[libraryKey(BEAR)]).toMatchObject({ rating: 5, status: "watched" });
    expect(titlesIn(lib, "watched").map((e) => e.rating)).toEqual([5]);
  });

  it("keeps a rated title even with no status or favourite, and drops it when cleared", () => {
    let lib = setRating({}, BEAR, 3, t(0));
    expect(Object.keys(lib)).toEqual([libraryKey(BEAR)]);
    lib = setRating(lib, BEAR, null, t(1));
    expect(lib).toEqual({});
  });

  it("keeps the rating when the status is cleared", () => {
    let lib = setRating(setStatus({}, BEAR, "watching", t(0)), BEAR, 2, t(1));
    lib = setStatus(lib, BEAR, null, t(2));
    expect(lib[libraryKey(BEAR)]).toMatchObject({ rating: 2, status: null });
  });

  it("refuses ratings outside 1-5", () => {
    for (const bad of [0, 6, 2.5, -1]) {
      expect(() => setRating({}, BEAR, bad, t(0))).toThrow(RangeError);
    }
  });

  it("reads lists saved before ratings existed", () => {
    const legacy = {
      "tv:136315": {
        id: 136315,
        mediaType: "tv",
        title: "The Bear",
        year: "2022",
        posterPath: null,
        favourite: true,
        status: "watching",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
    };
    expect(parseLibrary(JSON.stringify(legacy))["tv:136315"]).toMatchObject({ rating: null });
    const badRating = { "tv:136315": { ...legacy["tv:136315"], rating: 9 } };
    expect(parseLibrary(JSON.stringify(badRating))).toEqual({});
  });
});
