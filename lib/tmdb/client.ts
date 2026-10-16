import "server-only";
import type { z } from "zod";

export const TMDB_DEFAULT_BASE_URL = "https://api.themoviedb.org/3";

/** Cache lifetimes from the spec, in seconds. */
export const CACHE = {
  providers: 60 * 60 * 24,
  genres: 60 * 60 * 24,
  details: 60 * 60 * 6,
  watchProviders: 60 * 60 * 6,
  search: 60 * 60,
  discover: 60 * 60,
} as const;

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

export type TmdbFetchOptions = {
  /** Seconds to cache the response for (Next.js fetch revalidation). */
  revalidate: number;
  params?: Record<string, string | number | boolean | undefined>;
  /** Max attempts when TMDB responds 429 / 5xx. */
  maxAttempts?: number;
};

type Sleep = (ms: number) => Promise<void>;
let sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Test hook so retry tests don't actually wait. */
export function setSleepForTests(fn: Sleep) {
  sleep = fn;
}

function config() {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new TmdbError("TMDB_API_TOKEN is not set");
  const baseUrl = process.env.TMDB_API_BASE_URL || TMDB_DEFAULT_BASE_URL;
  return { token, baseUrl: baseUrl.replace(/\/$/, "") };
}

export function buildUrl(baseUrl: string, path: string, params: TmdbFetchOptions["params"] = {}) {
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

function retryDelayMs(res: Response, attempt: number) {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 10_000);
  return 250 * 2 ** attempt;
}

/**
 * Fetches a TMDB v3 endpoint, validates the body with `schema` and caches it
 * with Next.js fetch revalidation. Retries with backoff on 429 and 5xx.
 * Server-only: the bearer token must never reach the browser.
 */
export async function tmdbFetch<T extends z.ZodType>(
  path: string,
  schema: T,
  { revalidate, params, maxAttempts = 3 }: TmdbFetchOptions,
): Promise<z.infer<T>> {
  const { token, baseUrl } = config();
  const url = buildUrl(baseUrl, path, params);

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate },
    });

    if (res.ok) {
      const parsed = schema.safeParse(await res.json());
      if (!parsed.success) {
        throw new TmdbError(`Unexpected TMDB response for ${path}: ${parsed.error.message}`);
      }
      return parsed.data;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt + 1 >= maxAttempts) {
      throw new TmdbError(`TMDB ${path} failed with HTTP ${res.status}`, res.status);
    }
    await sleep(retryDelayMs(res, attempt));
  }
}
