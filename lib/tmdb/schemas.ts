import { z } from "zod";

export const MONETIZATION_TYPES = ["flatrate", "free", "ads", "rent", "buy"] as const;
export type MonetizationType = (typeof MONETIZATION_TYPES)[number];

export const mediaTypeSchema = z.enum(["movie", "tv"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

const genreSchema = z.object({ id: z.number(), name: z.string() });
export type Genre = z.infer<typeof genreSchema>;

export const genreListSchema = z.object({ genres: z.array(genreSchema) });

/** A movie or TV result as returned by search/discover. */
const movieResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  poster_path: z.string().nullish(),
  overview: z.string().nullish(),
  vote_average: z.number().nullish(),
  popularity: z.number().nullish(),
  genre_ids: z.array(z.number()).nullish(),
});

const tvResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  first_air_date: z.string().nullish(),
  poster_path: z.string().nullish(),
  overview: z.string().nullish(),
  vote_average: z.number().nullish(),
  popularity: z.number().nullish(),
  genre_ids: z.array(z.number()).nullish(),
});

const pagedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    page: z.number(),
    results: z.array(item),
    total_pages: z.number(),
    total_results: z.number(),
  });

/**
 * /search/multi returns movies, TV shows and people. We keep movies and TV and
 * drop everything else (people, or any future media type) instead of failing.
 */
export const searchMultiSchema = pagedSchema(
  z.union([
    movieResultSchema.extend({ media_type: z.literal("movie") }),
    tvResultSchema.extend({ media_type: z.literal("tv") }),
    z.object({ media_type: z.string() }).loose(),
  ]),
);

export const discoverMovieSchema = pagedSchema(movieResultSchema);
export const discoverTvSchema = pagedSchema(tvResultSchema);

export type MovieResult = z.infer<typeof movieResultSchema>;
export type TvResult = z.infer<typeof tvResultSchema>;

export const movieDetailsSchema = z.object({
  id: z.number(),
  title: z.string(),
  tagline: z.string().nullish(),
  overview: z.string().nullish(),
  release_date: z.string().nullish(),
  runtime: z.number().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  genres: z.array(genreSchema).default([]),
});
export type MovieDetails = z.infer<typeof movieDetailsSchema>;

export const tvDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  tagline: z.string().nullish(),
  overview: z.string().nullish(),
  first_air_date: z.string().nullish(),
  episode_run_time: z.array(z.number()).default([]),
  number_of_seasons: z.number().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  genres: z.array(genreSchema).default([]),
});
export type TvDetails = z.infer<typeof tvDetailsSchema>;

export const providerSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullish(),
  display_priority: z.number().nullish(),
});
export type Provider = z.infer<typeof providerSchema>;

export const regionProvidersSchema = z.object({
  link: z.string().nullish(),
  flatrate: z.array(providerSchema).optional(),
  free: z.array(providerSchema).optional(),
  ads: z.array(providerSchema).optional(),
  rent: z.array(providerSchema).optional(),
  buy: z.array(providerSchema).optional(),
});
/** Where-to-watch data for one title in one region. */
export type RegionProviders = z.infer<typeof regionProvidersSchema>;

export const watchProvidersSchema = z.object({
  id: z.number(),
  results: z.record(z.string(), regionProvidersSchema),
});

export const providerListSchema = z.object({
  results: z.array(
    providerSchema.extend({
      display_priorities: z.record(z.string(), z.number()).optional(),
    }),
  ),
});
