import type { ProviderLink } from "@/lib/data/schemas";

export type WatchLink = { url: string; kind: "search" | "home" };

/**
 * Where "Watch on {provider}" should go for a title: the service's own search
 * for it, else the service's home page. A region-specific entry beats a
 * region-less one. Returns null when the service isn't in provider-links.yaml.
 */
export function watchLinkFor(
  links: readonly ProviderLink[],
  providerId: number,
  region: string,
  title: string,
): WatchLink | null {
  const entry =
    links.find((l) => l.provider_id === providerId && l.region === region) ??
    links.find((l) => l.provider_id === providerId && l.region === undefined);
  if (!entry) return null;
  if (entry.search_url) {
    return { url: entry.search_url.replace("{query}", encodeURIComponent(title)), kind: "search" };
  }
  return { url: entry.home_url, kind: "home" };
}
