/**
 * The visitor's own list: favourites, plus one watch status per title.
 * Pure functions; lib/library/store.ts keeps the result in the browser.
 */

export const STATUSES = ["want", "watching", "watched"] as const;
export type WatchStatus = (typeof STATUSES)[number];

export type ListKey = WatchStatus | "favourites";

export const LISTS: readonly { key: ListKey; label: string }[] = [
  { key: "want", label: "Want to watch" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
  { key: "favourites", label: "Favourites" },
];

export const STATUS_LABELS: Record<WatchStatus, string> = {
  want: "Want to watch",
  watching: "Watching",
  watched: "Watched",
};

/** Enough about a title to show it in the list without calling TMDB. */
export type LibraryTitle = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string | null;
  posterPath: string | null;
};

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** A star rating, 1 to 5. */
export const isRating = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= MIN_RATING && (v as number) <= MAX_RATING;

export type LibraryEntry = LibraryTitle & {
  favourite: boolean;
  status: WatchStatus | null;
  /** The visitor's own rating, 1-5 stars; independent of the status. */
  rating: number | null;
  /** ISO timestamp of the last change, for "most recent first". */
  updatedAt: string;
};

/** Keyed by libraryKey(). */
export type Library = Record<string, LibraryEntry>;

export const libraryKey = (t: Pick<LibraryTitle, "id" | "mediaType">) => `${t.mediaType}:${t.id}`;

export function isListKey(value: unknown): value is ListKey {
  return LISTS.some((l) => l.key === value);
}

function isEntry(v: unknown): v is LibraryEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    Number.isInteger(e.id) &&
    (e.id as number) > 0 &&
    (e.mediaType === "movie" || e.mediaType === "tv") &&
    typeof e.title === "string" &&
    (e.year === null || typeof e.year === "string") &&
    (e.posterPath === null || typeof e.posterPath === "string") &&
    typeof e.favourite === "boolean" &&
    (e.status === null || STATUSES.includes(e.status as WatchStatus)) &&
    // Saved before ratings existed: no `rating` at all.
    (e.rating === undefined || e.rating === null || isRating(e.rating)) &&
    typeof e.updatedAt === "string"
  );
}

/** An entry is kept while it's a favourite, has a status or has a rating. */
const isKept = (e: Pick<LibraryEntry, "favourite" | "status" | "rating">) =>
  e.favourite || e.status !== null || e.rating !== null;

/** Reads a stored library, dropping anything malformed. */
export function parseLibrary(raw: string | null): Library {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const lib: Library = {};
    for (const entry of Object.values(value)) {
      if (!isEntry(entry)) continue;
      const normalised = { ...entry, rating: entry.rating ?? null };
      if (isKept(normalised)) lib[libraryKey(entry)] = normalised;
    }
    return lib;
  } catch {
    return {};
  }
}

function without(lib: Library, key: string): Library {
  const copy = { ...lib };
  delete copy[key];
  return copy;
}

function update(
  lib: Library,
  title: LibraryTitle,
  change: (e: LibraryEntry) => Partial<LibraryEntry>,
  now: Date,
): Library {
  const key = libraryKey(title);
  const current: LibraryEntry = lib[key] ?? {
    ...title,
    favourite: false,
    status: null,
    rating: null,
    updatedAt: "",
  };
  // Refresh the stored title details too (title or poster may have changed on TMDB).
  const next: LibraryEntry = {
    ...current,
    id: title.id,
    mediaType: title.mediaType,
    title: title.title,
    year: title.year,
    posterPath: title.posterPath,
    ...change(current),
    updatedAt: now.toISOString(),
  };
  // A title with no status, no rating and not a favourite isn't in the list any more.
  return isKept(next) ? { ...lib, [key]: next } : without(lib, key);
}

/** Sets the title's watch status; `null` takes it off the status lists. */
export function setStatus(
  lib: Library,
  title: LibraryTitle,
  status: WatchStatus | null,
  now = new Date(),
): Library {
  return update(lib, title, () => ({ status }), now);
}

/** Rates the title 1-5 stars; `null` clears the rating. */
export function setRating(
  lib: Library,
  title: LibraryTitle,
  rating: number | null,
  now = new Date(),
): Library {
  if (rating !== null && !isRating(rating))
    throw new RangeError(`Rating must be 1-5, got ${rating}`);
  return update(lib, title, () => ({ rating }), now);
}

export function toggleFavourite(lib: Library, title: LibraryTitle, now = new Date()): Library {
  return update(lib, title, (e) => ({ favourite: !e.favourite }), now);
}

export function removeTitle(lib: Library, title: Pick<LibraryTitle, "id" | "mediaType">): Library {
  return without(lib, libraryKey(title));
}

/** Titles in a list, most recently changed first. */
export function titlesIn(lib: Library, list: ListKey): LibraryEntry[] {
  return Object.values(lib)
    .filter((e) => (list === "favourites" ? e.favourite : e.status === list))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listCounts(lib: Library): Record<ListKey, number> {
  const counts: Record<ListKey, number> = { want: 0, watching: 0, watched: 0, favourites: 0 };
  for (const e of Object.values(lib)) {
    if (e.favourite) counts.favourites++;
    if (e.status) counts[e.status]++;
  }
  return counts;
}
