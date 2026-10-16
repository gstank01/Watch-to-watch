/** Shared between server and client. */
export const REGION_COOKIE = "wtw_region";
export const FALLBACK_REGION = "GB";

export function isRegionCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}
