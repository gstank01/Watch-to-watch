import "server-only";
import { discover } from "@/lib/tmdb";
import type { TitleSummary } from "@/lib/tmdb/types";

const STREAMING = ["flatrate", "free", "ads"];

/** Popular films and shows streaming in a region, interleaved. Optionally limited to providers. */
export async function popularStreaming(region: string, providerIds?: number[], limit = 12) {
  const [movies, tv] = await Promise.all(
    (["movie", "tv"] as const).map((type) =>
      discover(type, { region, providerIds, monetization: STREAMING, sortBy: "popularity.desc" }),
    ),
  );
  const out: TitleSummary[] = [];
  for (let i = 0; out.length < limit && (i < movies.results.length || i < tv.results.length); i++) {
    if (movies.results[i]) out.push(movies.results[i]);
    if (tv.results[i] && out.length < limit) out.push(tv.results[i]);
  }
  return out;
}

/** Most services shown as their own row on the home page. */
export const MAX_SERVICE_ROWS = 8;

/**
 * The newest releases streaming on one service, films and series interleaved.
 * TMDB doesn't say when a title arrived on a service, so "new" means newly
 * released. A few votes are required, to skip obscure listings.
 */
export async function newOnService(region: string, providerId: number, limit = 10) {
  const today = new Date().toISOString().slice(0, 10);
  const [movies, tv] = await Promise.all(
    (["movie", "tv"] as const).map((type) =>
      discover(type, {
        region,
        providerIds: [providerId],
        monetization: STREAMING,
        sortBy: type === "movie" ? "primary_release_date.desc" : "first_air_date.desc",
        releasedBy: today,
        minVotes: 10,
      }),
    ),
  );
  const out: TitleSummary[] = [];
  for (let i = 0; out.length < limit && (i < movies.results.length || i < tv.results.length); i++) {
    if (movies.results[i]) out.push(movies.results[i]);
    if (tv.results[i] && out.length < limit) out.push(tv.results[i]);
  }
  return out;
}

/** One "New on <service>" row per provider, in the order given. */
export async function newByService(region: string, providerIds: number[]) {
  const ids = providerIds.slice(0, MAX_SERVICE_ROWS);
  const rows = await Promise.all(ids.map((id) => newOnService(region, id)));
  return ids.map((providerId, i) => ({ providerId, titles: rows[i] }));
}
