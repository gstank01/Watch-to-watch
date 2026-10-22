/**
 * Browse filters, kept in the URL so a filtered page can be bookmarked and shared:
 * `/browse?type=tv&genre=35&where=mine&services=8,337&sort=top&page=2`.
 */
import type { MediaType } from "@/lib/tmdb/schemas";

export const SORTS = {
  popular: { label: "Popular", movie: "popularity.desc", tv: "popularity.desc" },
  top: { label: "Top rated", movie: "vote_average.desc", tv: "vote_average.desc" },
  new: { label: "Newest", movie: "primary_release_date.desc", tv: "first_air_date.desc" },
} as const;
export type SortKey = keyof typeof SORTS;

export const WHERE = {
  all: "Everything streaming",
  mine: "On my services",
  free: "Free",
} as const;
export type WhereKey = keyof typeof WHERE;

/** TMDB stops at page 500; nobody pages that far by hand. */
export const MAX_PAGE = 50;

export type BrowseState = {
  type: MediaType;
  genre: number | null;
  where: WhereKey;
  /** The visitor's services, only used with `where: "mine"`. */
  services: number[];
  sort: SortKey;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const positiveInt = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Reads filters from the URL, falling back to defaults for anything missing or odd. */
export function parseBrowse(params: Params): BrowseState {
  const type = one(params.type) === "tv" ? "tv" : "movie";
  const where = one(params.where);
  const sort = one(params.sort);
  const services = [
    ...new Set(
      (one(params.services) ?? "")
        .split(",")
        .map((s) => positiveInt(s))
        .filter((n): n is number => n !== null),
    ),
  ].slice(0, 30);
  return {
    type,
    genre: positiveInt(one(params.genre)),
    where: where === "mine" || where === "free" ? where : "all",
    services,
    sort: sort === "top" || sort === "new" ? sort : "popular",
    page: Math.min(positiveInt(one(params.page)) ?? 1, MAX_PAGE),
  };
}

/** The URL for `state` with `changes` applied; any change other than the page goes back to page 1. */
export function browseHref(state: BrowseState, changes: Partial<BrowseState> = {}): string {
  const next = { ...state, ...changes };
  if (!("page" in changes)) next.page = 1;
  const q = new URLSearchParams();
  if (next.type !== "movie") q.set("type", next.type);
  if (next.genre !== null) q.set("genre", String(next.genre));
  if (next.where !== "all") q.set("where", next.where);
  if (next.where === "mine" && next.services.length) q.set("services", next.services.join(","));
  if (next.sort !== "popular") q.set("sort", next.sort);
  if (next.page > 1) q.set("page", String(next.page));
  const s = q.toString();
  return s ? `/browse?${s}` : "/browse";
}
