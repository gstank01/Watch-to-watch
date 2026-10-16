import { describe, expect, it } from "vitest";
import {
  libraryKey,
  listCounts,
  parseLibrary,
  removeTitle,
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
