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
