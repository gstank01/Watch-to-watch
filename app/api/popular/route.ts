import { NextResponse, type NextRequest } from "next/server";
import { popularByService, popularStreaming } from "@/lib/popular";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getRegion } from "@/lib/region";
import { getProviders } from "@/lib/tmdb";
import { reportTmdbError } from "@/lib/tmdb/problem";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/**
 * Popular titles on the given providers (`providers=8,337`), for the visitor's region:
 * one mixed list, or with `by=service` one list per provider, with its name and logo.
 */
export async function GET(req: NextRequest) {
  if (!limiter(clientKey(req)).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const ids = (req.nextUrl.searchParams.get("providers") ?? "")
    .split(/[,|]/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 30);
  const byService = req.nextUrl.searchParams.get("by") === "service";
  if (ids.length === 0) return NextResponse.json(byService ? { services: [] } : { results: [] });

  try {
    const region = await getRegion();
    if (!byService) return NextResponse.json({ results: await popularStreaming(region, ids) });
    const [rows, providers] = await Promise.all([
      popularByService(region, ids),
      getProviders(region),
    ]);
    const info = new Map(providers.map((p) => [p.id, p]));
    return NextResponse.json({
      services: rows.flatMap((row) => {
        const p = info.get(row.providerId);
        return p ? [{ id: p.id, name: p.name, logoPath: p.logoPath, titles: row.titles }] : [];
      }),
    });
  } catch (err) {
    reportTmdbError(err, "api popular");
    return NextResponse.json({ error: "Unavailable right now" }, { status: 502 });
  }
}
