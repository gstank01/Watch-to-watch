import "server-only";
import { cookies } from "next/headers";
import { FALLBACK_REGION, REGION_COOKIE, isRegionCode } from "./region-shared";

export function defaultRegion() {
  const env = process.env.DEFAULT_REGION;
  return isRegionCode(env) ? env : FALLBACK_REGION;
}

/** The visitor's region: their saved choice, else DEFAULT_REGION. */
export async function getRegion(): Promise<string> {
  const value = (await cookies()).get(REGION_COOKIE)?.value;
  return isRegionCode(value) ? value : defaultRegion();
}
