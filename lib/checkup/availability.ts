import "server-only";
import { z } from "zod";
import { getFreeProviderIds } from "@/lib/data/free-services";
import { getWatchProviders } from "@/lib/tmdb";
import { MAX_CHECKED_TITLES, type TitleAvailability } from "./verdict";

/** `titles=movie:116149,tv:136315` → unique keys, at most MAX_CHECKED_TITLES. */
export const titleKeysSchema = z
  .string()
  .transform((s) => [...new Set(s.split(",").filter(Boolean))])
  .pipe(
    z
      .array(z.string().regex(/^(movie|tv):[1-9]\d{0,8}$/))
      .min(1)
      .max(MAX_CHECKED_TITLES),
  );

/** Runs `fn` over `items`, at most `limit` at a time. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason: unknown) => ({ status: "rejected" as const, reason }),
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Where each title streams in `region`. Titles whose lookup failed are left
 * out; if every lookup failed, the first error is thrown.
 */
export async function streamingFor(
  keys: string[],
  region: string,
): Promise<Record<string, TitleAvailability>> {
  const freeIds = new Set(getFreeProviderIds(region));
  const settled = await mapLimit(keys, 6, async (key) => {
    const [mediaType, id] = key.split(":") as ["movie" | "tv", string];
    const providers = await getWatchProviders(mediaType, Number(id), region);
    const flatrate = (providers.flatrate ?? []).map((p) => p.provider_id);
    const freeOffers = [...(providers.free ?? []), ...(providers.ads ?? [])].map(
      (p) => p.provider_id,
    );
    return {
      providers: [...new Set([...flatrate, ...freeOffers])],
      free: freeOffers.length > 0 || flatrate.some((id) => freeIds.has(id)),
    };
  });

  const results: Record<string, TitleAvailability> = {};
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") results[keys[i]] = r.value;
  });
  const failed = settled.find((r) => r.status === "rejected");
  if (failed && Object.keys(results).length === 0) throw failed.reason;
  return results;
}
