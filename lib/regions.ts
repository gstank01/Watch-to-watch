import "server-only";
import { getRegions } from "@/lib/tmdb";

/** Human-readable region name; falls back to the code when TMDB is unavailable. */
export async function regionName(code: string) {
  try {
    return (await getRegions()).find((r) => r.code === code)?.name ?? code;
  } catch {
    return code;
  }
}
