import "server-only";
import { cookies, headers } from "next/headers";
import { REGION_COOKIE, resolveRegion } from "./region-shared";

/**
 * The visitor's region: their saved choice, else their country from the
 * hosting platform's geolocation header (Vercel sets `x-vercel-ip-country`),
 * else DEFAULT_REGION. Only the two-letter country is used; nothing is stored.
 */
export async function getRegion(): Promise<string> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveRegion({
    saved: cookieStore.get(REGION_COOKIE)?.value,
    geo: headerList.get("x-vercel-ip-country"),
    fallback: process.env.DEFAULT_REGION,
  });
}
