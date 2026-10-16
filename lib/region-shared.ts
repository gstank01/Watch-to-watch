/** Shared between server and client. */
export const REGION_COOKIE = "wtw_region";
export const FALLBACK_REGION = "GB";

export type SupportedRegion = {
  /** ISO 3166-1 alpha-2, as TMDB uses for watch regions. */
  code: string;
  /** English name, used in headings ("Where to watch in Bulgaria"). */
  name: string;
  /** Label in the country picker. */
  label: string;
  flag: string;
};

/** Countries the app supports. Add a region here, then add its curated data in data/. */
export const SUPPORTED_REGIONS: readonly SupportedRegion[] = [
  { code: "GB", name: "United Kingdom", label: "United Kingdom", flag: "🇬🇧" },
  { code: "BG", name: "Bulgaria", label: "България / Bulgaria", flag: "🇧🇬" },
];

export const SUPPORTED_REGION_CODES = SUPPORTED_REGIONS.map((r) => r.code);

export function isSupportedRegion(value: unknown): value is string {
  return typeof value === "string" && SUPPORTED_REGION_CODES.includes(value);
}

export function regionInfo(code: string): SupportedRegion {
  return SUPPORTED_REGIONS.find((r) => r.code === code) ?? SUPPORTED_REGIONS[0];
}

/**
 * Picks the visitor's region: their saved choice, else the country they are
 * browsing from (when we support it), else the configured default.
 */
export function resolveRegion({
  saved,
  geo,
  fallback,
}: {
  saved?: string | null;
  geo?: string | null;
  fallback?: string | null;
}): string {
  if (isSupportedRegion(saved)) return saved;
  const geoCode = geo?.toUpperCase();
  if (isSupportedRegion(geoCode)) return geoCode;
  if (isSupportedRegion(fallback)) return fallback;
  return FALLBACK_REGION;
}
