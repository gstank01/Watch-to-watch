import "server-only";
import { CACHE, tmdbFetch } from "./client";
import {
  discoverMovieSchema,
  discoverTvSchema,
  genreListSchema,
  movieDetailsSchema,
  providerListSchema,
  regionListSchema,
  searchMultiSchema,
  tvDetailsSchema,
  watchProvidersSchema,
  type MediaType,
  type MovieResult,
  type Region,
  type RegionProviders,
  type TvResult,
} from "./schemas";
import type { ProviderInfo, TitleSummary } from "./types";

export { TmdbError } from "./client";
export type * from "./schemas";
export type * from "./types";

const yearOf = (date: string | null | undefined) => (date ? date.slice(0, 4) || null : null);

export function fromMovie(m: MovieResult): TitleSummary {
  return {
    id: m.id,
    mediaType: "movie",
    title: m.title,
    year: yearOf(m.release_date),
    posterPath: m.poster_path ?? null,
    overview: m.overview ?? "",
    rating: m.vote_average ?? null,
  };
}

export function fromTv(t: TvResult): TitleSummary {
  return {
    id: t.id,
    mediaType: "tv",
    title: t.name,
    year: yearOf(t.first_air_date),
    posterPath: t.poster_path ?? null,
    overview: t.overview ?? "",
    rating: t.vote_average ?? null,
  };
}

/** Search films and TV shows (people are dropped). */
export async function searchTitles(query: string, region: string, page = 1) {
  const data = await tmdbFetch("/search/multi", searchMultiSchema, {
    revalidate: CACHE.search,
    params: { query, region, page, include_adult: false },
  });
  const results: TitleSummary[] = [];
  for (const r of data.results) {
    if (r.media_type === "movie" && "title" in r) results.push(fromMovie(r as MovieResult));
    else if (r.media_type === "tv" && "name" in r) results.push(fromTv(r as TvResult));
  }
  return { results, page: data.page, totalPages: data.total_pages };
}

export function getMovie(id: number) {
  return tmdbFetch(`/movie/${id}`, movieDetailsSchema, { revalidate: CACHE.details });
}

export function getTv(id: number) {
  return tmdbFetch(`/tv/${id}`, tvDetailsSchema, { revalidate: CACHE.details });
}

/** Where-to-watch for one title in one region. Empty object when nothing is listed. */
export async function getWatchProviders(
  mediaType: MediaType,
  id: number,
  region: string,
): Promise<RegionProviders> {
  const data = await tmdbFetch(`/${mediaType}/${id}/watch/providers`, watchProvidersSchema, {
    revalidate: CACHE.watchProviders,
  });
  return data.results[region] ?? {};
}

/** All streaming providers in a region (movie + TV lists merged), most prominent first. */
export async function getProviders(region: string): Promise<ProviderInfo[]> {
  const [movie, tv] = await Promise.all(
    (["movie", "tv"] as const).map((type) =>
      tmdbFetch(`/watch/providers/${type}`, providerListSchema, {
        revalidate: CACHE.providers,
        params: { watch_region: region },
      }),
    ),
  );
  const byId = new Map<number, ProviderInfo>();
  for (const p of [...movie.results, ...tv.results]) {
    if (byId.has(p.provider_id)) continue;
    byId.set(p.provider_id, {
      id: p.provider_id,
      name: p.provider_name,
      logoPath: p.logo_path ?? null,
      priority: p.display_priorities?.[region] ?? p.display_priority ?? 999,
    });
  }
  return [...byId.values()].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export async function getRegions(): Promise<Region[]> {
  const data = await tmdbFetch("/watch/providers/regions", regionListSchema, {
    revalidate: CACHE.providers,
  });
  return data.results
    .map((r) => ({ code: r.iso_3166_1, name: r.english_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGenres(mediaType: MediaType) {
  const data = await tmdbFetch(`/genre/${mediaType}/list`, genreListSchema, {
    revalidate: CACHE.genres,
  });
  return data.genres;
}

export type DiscoverOptions = {
  region: string;
  providerIds?: number[];
  monetization?: string[];
  genreIds?: number[];
  maxRuntime?: number;
  sortBy?: string;
  page?: number;
};

/** Discover films or shows. Provider and genre lists are OR'd (pipe-separated). */
export async function discover(mediaType: MediaType, opts: DiscoverOptions) {
  const params = {
    watch_region: opts.region,
    with_watch_providers: opts.providerIds?.length ? opts.providerIds.join("|") : undefined,
    with_watch_monetization_types: opts.monetization?.length
      ? opts.monetization.join("|")
      : undefined,
    with_genres: opts.genreIds?.length ? opts.genreIds.join("|") : undefined,
    "with_runtime.lte": opts.maxRuntime,
    sort_by: opts.sortBy ?? "popularity.desc",
    page: opts.page ?? 1,
    include_adult: false,
  };
  if (mediaType === "movie") {
    const data = await tmdbFetch("/discover/movie", discoverMovieSchema, {
      revalidate: CACHE.discover,
      params,
    });
    return { results: data.results.map(fromMovie), page: data.page, totalPages: data.total_pages };
  }
  const data = await tmdbFetch("/discover/tv", discoverTvSchema, {
    revalidate: CACHE.discover,
    params,
  });
  return { results: data.results.map(fromTv), page: data.page, totalPages: data.total_pages };
}
